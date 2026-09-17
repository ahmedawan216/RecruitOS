import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, mocks = {}, globals = {}) {
  const source = ts.transpileModule(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const loadedModule = { exports: {} };
  new Function('module', 'exports', 'require', ...Object.keys(globals), source)(loadedModule, loadedModule.exports, id => id in mocks ? mocks[id] : require(id), ...Object.values(globals));
  return loadedModule.exports;
}
const schema = load('lib/analytics/schema.ts');
const id = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';
const secret = 'private.candidate@example.invalid';
function browserHarness(choice = 'accepted') {
  const jar = new Map(choice ? [[schema.CONSENT_COOKIE, choice]] : []), storage = new Map(), calls = [];
  const document = { referrer: 'https://www.linkedin.com/in/private-person' };
  Object.defineProperty(document, 'cookie', { get: () => [...jar].map(([k,v]) => `${k}=${v}`).join('; '), set: value => { const [pair] = value.split(';'); const split = pair.indexOf('='); if (value.includes('Max-Age=0;')) jar.delete(pair.slice(0,split)); else jar.set(pair.slice(0,split), pair.slice(split+1)); } });
  const sdk = { init: (key, config) => calls.push(['init',config]), capture: (...a) => calls.push(['capture',...a]), identify: (...a) => calls.push(['identify',...a]), reset: (...a) => calls.push(['reset',...a]), opt_out_capturing() {}, opt_in_capturing() {} };
  const navigator = {};
  const api = load('lib/analytics/client.ts', { 'posthog-js': sdk, './schema': schema }, {
    document, navigator, location: { href: 'https://recruitos.test/?utm_source=linkedin&utm_campaign=launch&code=SECRET', pathname: '/', protocol:'https:' },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    window: { dispatchEvent() {} }, process: { env: { NEXT_PUBLIC_POSTHOG_KEY:'phc_test_only', NEXT_PUBLIC_POSTHOG_HOST:'https://us.i.posthog.com', NEXT_PUBLIC_VERCEL_ENV:'preview' } },
  });
  return { api, calls, jar, storage, navigator };
}
function serverHarness({ consent = 'accepted', privacy, fail = false, key = 'phc_test_only' } = {}) {
  const jobs = [], requests = [], warnings = [];
  const api = load('lib/analytics/server.ts', {
    'server-only': {}, './schema': schema,
    'next/headers': { cookies: async () => ({ get: k => ({value: k === schema.CONSENT_COOKIE ? consent : encodeURIComponent(JSON.stringify({utm_source:'linkedin',utm_campaign:'launch',email:secret}))}) }), headers: async () => ({get: k => k === privacy ? '1' : null}) },
    'next/server': {after: fn => jobs.push(fn)},
  }, { process: {env: {NEXT_PUBLIC_POSTHOG_KEY:key,NEXT_PUBLIC_POSTHOG_HOST:'https://us.i.posthog.com',VERCEL_ENV:'preview'}}, fetch: async (url, options) => { requests.push({url, ...options, data:JSON.parse(options.body)}); if(fail) throw new Error(secret); return {ok:true}; }, console: {warn: (...a) => warnings.push(a)} });
  return {api,jobs,requests,warnings};
}
test('attribution accepts only reviewed campaign values and canonical domains/routes', () => {
  assert.deepEqual(schema.acquisition('https://r.test/?utm_source=linkedin&utm_medium=outreach&utm_campaign=launch&utm_content=dm&utm_term=recruitos&email='+secret, 'https://www.linkedin.com/in/private-name'), {utm_source:'linkedin',utm_medium:'outreach',utm_campaign:'launch',utm_content:'dm',utm_term:'recruitos',referring_domain:'linkedin.com',landing_page:'/'});
  const value = schema.acquisition('https://r.test/dashboard/candidates/private-name?utm_content='+secret, 'https://private-name.example.com/path');
  assert.deepEqual(value, {referring_domain:'external',landing_page:'/dashboard'});
  assert.equal(schema.acquisition('https://r.test/','').referring_domain,'direct');
  assert.equal(schema.acquisition('https://r.test/','https://www.google.com/search?q=private').referring_domain,'google.com');
});
test('event allowlists strip all domain payloads, nested objects, unsafe enums and invalid counts', () => {
  for (const event of schema.events) {
    const safe = schema.safeProperties(event, {email:secret, filename:secret, command_type:secret, candidate_count:Infinity, resume: {email:secret}, $current_url:secret, utm_campaign:secret, analysis:secret, token:secret});
    assert.deepEqual(safe,{});
  }
  assert.deepEqual(schema.safeProperties('command_completed',{command_type:'shortlist',candidate_count:3,partial:true,environment:'preview',auth_state:'authenticated',job_count:10}), {command_type:'shortlist',candidate_count:3,partial:true,auth_state:'authenticated',environment:'preview'});
});
test('no SDK initialization or events before consent, after decline, or under browser privacy signals', () => {
  for (const choice of ['', 'declined']) { const h=browserHarness(choice); h.api.captureClient('landing_page_viewed'); assert.equal(h.calls.length,0); }
  for (const signal of ['doNotTrack','globalPrivacyControl']) { const h=browserHarness(); h.navigator[signal]=signal==='doNotTrack'?'1':true; h.api.initializeAnalytics(); assert.equal(h.calls.length,0); }
});
test('browser boundary drops replay/autocapture and SDK-injected PII, including person properties', () => {
  const h=browserHarness(); h.api.initializeAnalytics();
  const filter=h.api.privacyConfig.before_send;
  const payload={uuid:secondId,event:'landing_page_viewed',properties:{distinct_id:id,$current_url:secret,$referrer:secret,email:secret,$set:{email:secret},auth_state:'anonymous'},$set:{email:secret},$set_once:{email:secret}};
  const safe=filter(payload);
  assert.doesNotMatch(JSON.stringify(safe), /private|\$current_url|\$referrer|email/);
  assert.equal(safe.properties.token,'phc_test_only');
  for (const event of ['$snapshot','$autocapture','$exception','$pageview','$set','$feature_flag_called','unknown']) assert.equal(filter({...payload,event}),null);
  assert.equal(h.api.privacyConfig.disable_session_recording,true);
  assert.equal(h.api.privacyConfig.disable_external_dependency_loading,true);
  assert.equal(h.api.privacyConfig.autocapture,false);
  const identity=filter({...payload,event:'$identify',properties:{distinct_id:id,$anon_distinct_id:secondId,email:secret}});
  assert.equal(identity.properties.$anon_distinct_id,secondId);
  assert.equal(identity.$set_once.utm_campaign,'launch');
  assert.doesNotMatch(JSON.stringify(identity),/private/);
});
test('first attribution persists through navigation and reload, identity resets between accounts', () => {
  const h=browserHarness(); h.api.initializeAnalytics();
  assert.ok(h.jar.get(schema.ATTRIBUTION_COOKIE).includes('linkedin'));
  h.api.identifyRecruiter(id); h.api.captureClient('signup_started');
  assert.equal(h.calls.find(c=>c[0]==='capture')[2].utm_campaign,'launch');
  h.api.identifyRecruiter(secondId);
  assert.ok(h.calls.some(c=>c[0]==='reset'));
  h.api.captureClient('workspace_visited');
  assert.equal(h.calls.filter(c=>c[0]==='capture').at(-1)[2].utm_campaign,undefined);
  h.api.identifyRecruiter(null);
  assert.equal(h.storage.get('recruitos_analytics_user'),undefined);
});
test('workspace visits deduplicate and return usage starts after 30 minutes of inactivity', () => {
  const h=browserHarness(); h.api.identifyRecruiter(id); h.api.recordWorkspaceVisit(); h.api.recordWorkspaceVisit();
  let visits=h.calls.filter(c=>c[1]==='workspace_visited'); assert.equal(visits.length,1); assert.equal(visits[0][2].return_visit,false);
  h.storage.set('recruitos_workspace_visit',String(Date.now()-31*60*1000)); h.api.recordWorkspaceVisit();
  visits=h.calls.filter(c=>c[1]==='workspace_visited'); assert.equal(visits.length,2); assert.equal(visits[1][2].return_visit,true);
});
test('withdrawal clears attribution and rejects subsequent browser captures', () => {
  const h=browserHarness(); h.api.identifyRecruiter(id); h.api.setAnalyticsConsent(false);
  assert.equal(h.jar.has(schema.ATTRIBUTION_COOKIE),false); assert.equal(h.storage.size,0);
  assert.equal(h.api.privacyConfig.before_send({event:'landing_page_viewed',properties:{distinct_id:id}}),null);
});
test('server events require consent, honor DNT/GPC, verified UUID identities and configured key', async () => {
  for(const options of [{consent:'declined'},{consent:''},{privacy:'dnt'},{privacy:'sec-gpc'},{key:''}]) {const h=serverHarness(options);await h.api.captureOutcome(id,'job_created',{job_count:1},'operation');assert.equal(h.jobs.length,0);}
  const h=serverHarness();await h.api.captureOutcome(secret,'job_created');assert.equal(h.jobs.length,0);
});
test('server delivery is deferred, strictly filtered and has stable per-operation deduplication IDs', async () => {
  const h=serverHarness();
  await h.api.captureOutcome(id,'job_created',{job_count:1,email:secret,filename:secret},'private-operation');
  await h.api.captureOutcome(id,'job_created',{job_count:1},'private-operation');
  assert.equal(h.requests.length,0); await Promise.all(h.jobs.map(f=>f()));
  assert.equal(h.requests.length,2); const event=h.requests[0].data;
  assert.equal(event.uuid,h.requests[1].data.uuid); assert.ok(schema.safeId(event.uuid));
  assert.equal(event.properties.utm_campaign,'launch');assert.equal(event.properties.auth_state,'authenticated');
  assert.equal(event.properties.$geoip_disable,true);assert.equal(event.properties.environment,'preview');
  assert.doesNotMatch(h.requests[0].body,/private|filename|email/);
  assert.ok(h.requests[0].signal instanceof AbortSignal);
});
test('analytics transport failures never fail domain work or leak diagnostics', async () => {
  const h=serverHarness({fail:true});await h.api.captureOutcome(id,'job_created',{job_count:1});await h.jobs[0]();assert.equal(h.warnings.length,1);assert.doesNotMatch(JSON.stringify(h.warnings),/private/);
});
test('signup tracks a real new account only, including email confirmation without a session', async () => {
  for (const mode of ['new','existing','error','invalid']) {
    const captures=[];
    const auth=load('app/auth/actions.ts',{
      '@/lib/analytics/server':{captureOutcome:async (...args)=>captures.push(args)},
      'next/headers':{cookies:async ()=>({})}, 'next/navigation':{redirect:()=>{}},
      '@/lib/supabase/auth':{getSafeRedirectPath:()=>'/dashboard',createCookieStorage:()=>({}),createSupabaseAuthClient:()=>({auth:{signUp:async()=>({data:{user:{id,identities:mode==='existing'?[]:[{id}]},session:null},error:mode==='error'?{message:secret}:null})}})},
      '@/lib/supabase/auth-cookies':{setSessionCookies(){},clearSessionCookies(){}},
      '@/lib/supabase/auth-errors':{getUserFacingAuthErrorMessage:()=> 'Try again',SIGN_UP_ERROR_FALLBACK:'Try again'},
    });
    const form=new FormData();form.set('email',secret);form.set('password',mode==='invalid'?'short':'test-password');form.set('confirmPassword','test-password');
    await auth.signUp({},form);
    assert.equal(captures.length,mode==='new'?1:0);
    if(captures.length){assert.equal(captures[0][1],'signup_completed');assert.deepEqual(captures[0][2],{confirmation_required:true});assert.doesNotMatch(JSON.stringify(captures),/private/);}
  }
});
test('job completion is counted only after the existing authoritative creation succeeds', async () => {
  for(const allowed of [true,false]) {
    const captures=[];
    const action=load('app/actions/create-job.ts',{
      '@/lib/analytics/server':{captureOutcome:async(...a)=>captures.push(a)},
      '@/lib/supabase/auth':{requireAuthenticatedUser:async()=>({id})},
      '@/lib/recruitos/usage-server':{createJobWithinPlanLimit:async()=>({allowed,jobId:secondId,limit:{message:'Limit reached'}})},
    });
    const form=new FormData();form.set('title',secret);form.set('description',secret);
    const result=await action.createJob({success:false},form);
    assert.equal(result.success,allowed);assert.equal(captures.length,allowed?1:0);assert.doesNotMatch(JSON.stringify(captures),/private/);
  }
});
test('standalone comparisons count rendered results once and respect consent/count gates', () => {
  const h=browserHarness(); const key='a'.repeat(64);
  h.api.recordComparison(key,2,id); h.api.recordComparison(key,2,id); h.api.recordComparison('b'.repeat(64),1,id);
  assert.equal(h.calls.filter(c=>c[1]==='candidate_comparison_completed').length,1);
  h.api.setAnalyticsConsent(false); h.api.recordComparison('b'.repeat(64),2,id);
  assert.equal(h.calls.filter(c=>c[1]==='candidate_comparison_completed').length,1);
});
