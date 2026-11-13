(function(){
'use strict';

/* ---------- defaults ---------- */
var DEFAULT_PROGRAM=[
 ['A','Hinge','Single-leg RDL',3,'6-10','Single-leg RDL + backpack','Stand on one leg, soft knee. Hinge forward as the other leg goes straight back, back flat, then stand tall.',true],
 ['A','Bridge','Single-leg glute bridge',3,'8-12','Hip thrust (shoulders on couch)','On your back, one foot flat, the other leg straight. Drive through the heel until hips and knee line up. Lower slowly.',true],
 ['A','Squat','Split squat',3,'8-10','Split squat + backpack','Long stance, back heel up. Drop the back knee straight down without touching, then drive up through the front foot.',true],
 ['A','Side core','Side plank hip dips',3,'8-12','Side plank with reach','Side plank on your forearm, feet stacked. Lower the hips toward the floor, then lift past straight. Smooth, no holding.',true],
 ['A','Anti-twist','Plank shoulder taps',3,'8-12','Bear crawl shoulder taps','Push-up position, feet a little wide. Tap one shoulder with the opposite hand without letting your hips rock.',true],
 ['B','Hinge','RDL, loaded backpack',3,'8-12','Dumbbell RDL (gym)','Backpack held at your chest. Hips back, flat back, slide down to just below the knees, then stand tall.',true],
 ['B','Squat','Goblet squat',3,'8-12','Dumbbell goblet squat (gym)','Weight held at your chest. Sit down between your heels, chest up, then drive up.',true],
 ['B','Pull','Band row',3,'10-15','Cable row (gym)','Palms facing each other. Pull your elbows back and squeeze your shoulder blades, then let the arms go forward slowly.',true],
 ['B','Anti-twist','Pallof press',3,'10','Cable Pallof press (gym)','Band anchored at your side. Press straight out and back in without letting it turn you.',true],
 ['B','Push','Push-up',3,'8-12','Push-up, feet raised','Body in one line. Lower your chest between your hands, then push away. Hands on a counter if the wrist complains.',true],
 ['A','Bridge','Hip thrust (shoulders on couch)',3,'8-12','Hip thrust + backpack','Upper back on the couch edge, feet flat. Drive the hips up until level, then lower slowly.',false],
 ['B','Hinge','Dumbbell RDL (gym)',3,'8-12','','From Nov 26, in the weight room. Same hinge, dumbbells along the thighs.',false]
];
var MOB=[
 ['heel','Heel slide','On your back, knees bent. Slide one heel away until the leg is straight, then back. 10 each leg.'],
 ['catcow','Cat-cow','On hands and knees, round your back up, then let it dip. Slow, 8 times.'],
 ['hips','Hip circles','Slow circles with one knee, 5 each way per side. Keep them small.'],
 ['knee','Knee rock','On your back, knees bent, let both knees drift to one side and back. 8 each side.'],
 ['press','Press-up','On your stomach, push up onto forearms, then hands, as far as comfortable. 8 slow reps.'],
 ['fig4','Figure four','On your back, ankle on the opposite knee, draw the leg in gently. About 30 seconds a side.']
];
var CARDIO=[
 ['walk','Walk','Brisk enough that talking takes a little effort.'],
 ['bike','Bike','Stationary or outside. Seat high enough that the knee stays slightly bent at the bottom.'],
 ['elliptical','Elliptical','Stand tall; let the legs do it rather than pulling with the arms.'],
 ['incline','Incline walk / stairs','Short steps, no leaning on the rails.'],
 ['rower','Rower','Push with the legs first, then lean back slightly, then pull. No twisting.'],
 ['swim','Swim','Easy pace.']
];
var VIS={};try{VIS=JSON.parse(localStorage.getItem('physio:vis')||'{}')||{};}catch(e){VIS={};}
function visOn(k,p,id){return ((VIS[k]||{})[p]||[]).indexOf(id)>-1;}
function visToggle(k,p,id){var d=VIS[k]=VIS[k]||{},a=d[p]=d[p]||[],i=a.indexOf(id);if(i>-1)a.splice(i,1);else a.push(id);
  var keep={},t=today();Object.keys(VIS).forEach(function(x){if(daysBetween(x,t)<30)keep[x]=VIS[x];});VIS=keep;
  try{localStorage.setItem('physio:vis',JSON.stringify(VIS));}catch(e){}}
var FEEL={easy:'Easy',right:'About right',too:'Too much'};

/* ---------- animations ---------- */
function P(a){return {head:a[0],sh:a[1],hip:a[2],kn:a[3],an:a[4],kf:a[5],af:a[6],en:a[7],hn:a[8],ef:a[9],hf:a[10]};}
var STAND=[[150,10],[150,30],[150,80],[150,125],[150,170],[152,125],[152,170],[152,58],[152,84],[148,58],[148,84]];
var PLANK=[[62,98],[80,108],[160,128],[205,148],[250,166],[207,150],[252,167],[82,138],[84,168],[86,138],[88,168]];
function tweak(base,ch){var a=base.map(function(p){return p.slice();});for(var k in ch)a[k]=ch[k];return a;}
var ANIM={
 slrdl:{dy:30,feet:1,feel:['hip','kn',.3],keys:[[STAND,'Tall on one leg',2200,500],[[[194,54],[176,64],[132,86],[154,126],[150,170],[91,106],[52,126],[178,92],[180,118],[174,92],[176,118]],'Hinge, back leg reaches',2200,500]]},
 hinge:{dy:30,feet:1,feel:['hip','kn',.3],keys:[[STAND,'Stand tall, soft knees',2200,500],[[[190,52],[172,62],[128,86],[155,126],[150,170],[157,126],[152,170],[174,90],[176,116],[170,90],[172,116]],'Hips back, back flat',2200,500]]},
 slbridge:{dy:30,feet:1,feel:['hip','hip',0],keys:[[[[66,160],[90,160],[150,160],[176,118],[196,162],[195,138],[238,118],[118,163],[146,164],[118,164],[146,165]],'One leg out straight',2000,500],[[[66,160],[90,160],[145,135],[190,114],[196,162],[190,114],[233,94],[118,163],[146,164],[118,164],[146,165]],'Drive up through the heel',2000,600]]},
 bridge:{dy:30,feet:1,feel:['hip','hip',0],keys:[[[[66,160],[90,160],[150,160],[176,118],[196,162],[179,119],[199,162],[118,163],[146,164],[118,164],[146,165]],'Feet flat, knees bent',2000,500],[[[66,160],[90,160],[145,135],[190,114],[196,162],[193,115],[199,162],[118,163],[146,164],[118,164],[146,165]],'Squeeze and lift',2000,700]]},
 dips:{dy:30,feel:['sh','hip',.6],keys:[[[[69,131],[90,138],[150,160],[204,163],[258,166],[208,159],[262,162],[90,166],[120,166],[124,135],[150,154]],'Hips down toward the floor',1600,300],[[[68,137],[90,138],[150,140],[204,153],[258,166],[208,149],[262,162],[90,166],[120,166],[124,125],[150,134]],'Lift past straight',1600,400]]},
 pushup:{dy:30,feel:['sh','en',.2],keys:[[PLANK,'Arms straight, body in one line',1800,400],[[[60,136],[80,146],[160,156],[205,162],[250,166],[207,163],[252,167],[106,150],[86,168],[110,150],[90,168]],'Chest down between the hands',1800,400]]},
 taps:{dy:30,feel:['sh','hip',.5],keys:[[PLANK,'Plank, feet a little wide',1400,300],[tweak(PLANK,{7:[98,124],8:[78,106]}),'Tap, hips stay still',1200,300],[PLANK,'Hand back down',1200,300],[tweak(PLANK,{9:[100,124],10:[80,104]}),'Other side',1200,300]]},
 goblet:{dy:30,feet:1,feel:['hip','kn',.4],keys:[[tweak(STAND,{7:[164,52],8:[158,38],9:[162,54],10:[156,40]}),'Weight at your chest',2000,400],[[[162,62],[160,82],[128,124],[170,128],[150,170],[172,130],[152,170],[178,100],[168,86],[176,102],[166,88]],'Sit between your heels',2000,500]]},
 split:{dy:30,feet:1,keys:[[[[141,22],[141,42],[141,92],[165,131],[186,170],[137,138],[96,158],[147,66],[145,90],[135,66],[137,90]],'Drive up through the front heel',1800,400],[[[149,51],[146,71],[140,122],[186,122],[186,170],[140,166],[96,158],[152,95],[147,118],[140,95],[136,118]],'Lower straight down, 2 seconds',2200,500]]},
 row:{dy:30,feel:['sh','sh',0],band:true,keys:[[[[100,100],[100,118],[100,162],[158,160],[214,160],[160,164],[216,164],[128,122],[156,118],[126,126],[154,122]],'Arms out in front',2000,500],[[[98,100],[98,118],[100,162],[158,160],[214,160],[160,164],[216,164],[78,130],[112,126],[76,134],[110,130]],'Elbows back, squeeze',2000,500]]}
};
function animFor(name){
  var n=(name||'').toLowerCase();
  if(/single-leg rdl/.test(n))return 'slrdl';
  if(/rdl|deadlift|hinge/.test(n))return 'hinge';
  if(/single-leg (glute )?bridge/.test(n))return 'slbridge';
  if(/hip thrust|bridge/.test(n))return 'bridge';
  if(/hip dip/.test(n))return 'dips';
  if(/shoulder tap/.test(n)&&!/bear/.test(n))return 'taps';
  if(/push-?up/.test(n))return 'pushup';
  if(/split squat/.test(n))return 'split';
  if(/squat/.test(n))return 'goblet';
  if(/row/.test(n)&&!/cable/.test(n))return 'row';
  return null;
}
/* ---------- where you should feel it ----------
   zones: [jointA, jointB, t (0..1 along A→B), 'work'|'stretch', radius, optional [dx,dy] offset]
   near limbs (dark) are kn/an/en/hn, far limbs (light) are kf/af/ef/hf. */
var FEELS={
 split:{zones:[['hip','kn',.6,'work',15],['hip','hip',0,'work',12,[-13,-2]],['hip','kf',.42,'stretch',11,[-3,0]]],
  work:'Mostly the front leg: the front of the thigh and the glute of the front leg. That leg does about 80% of the work.',
  stretch:'A mild stretch at the front of the back hip is normal. The back leg is there for balance, not to push.',
  fix:'If it’s mostly the back leg, your weight is drifting back. Lean your chest forward a little, keep the front heel planted and push up through it, and drop the back knee straight down under your hip. If the stretch at the front of the back hip pinches, shorten the stance a bit and go less deep.'},
 slrdl:{zones:[['hip','kn',.5,'work',15,[-6,0]],['hip','hip',0,'work',12,[-6,-8]]],
  work:'The back of the standing leg’s thigh (hamstring) and that glute.',
  stretch:'A hamstring stretch at the bottom is fine.',
  fix:'If your low back is working, you’re bending at the waist. Keep the back flat, push the hips back, and only go as low as the back stays flat. Keep a soft bend in the standing knee.'},
 hinge:{zones:[['hip','kn',.45,'work',16],['hip','hip',0,'work',13]],
  work:'The back of both thighs (hamstrings) and your glutes.',
  stretch:'A hamstring stretch at the bottom is fine.',
  fix:'If your low back is working, stop where the back starts to round and push the hips further back instead of bending forward.'},
 slbridge:{zones:[['hip','hip',0,'work',16],['hip','kn',.5,'work',11]],
  work:'The glute of the leg with the foot down, plus some hamstring.',
  stretch:'',
  fix:'If the hamstring cramps, bring that foot closer to your bum. If the low back works, don’t lift as high: stop when hip and knee line up.'},
 bridge:{zones:[['hip','hip',0,'work',17]],
  work:'Your glutes.',
  stretch:'',
  fix:'If the hamstrings cramp, bring your feet closer. If the low back works, lift less and keep your ribs down.'},
 dips:{zones:[['sh','hip',.65,'work',16],['hip','hip',0,'work',12]],
  work:'The side of your waist and hip on the side that’s on the floor.',
  stretch:'',
  fix:'If the shoulder is doing the work, put the elbow right under the shoulder and push the floor away. Stop if anything pulls in the groin or lower belly; make the dips smaller.'},
 taps:{zones:[['sh','hip',.5,'work',17]],
  work:'The front of your core, holding the body still, plus the shoulders.',
  stretch:'',
  fix:'If your hips rock side to side, widen your feet and tap slower.'},
 pushup:{zones:[['sh','en',.25,'work',15],['en','hn',.15,'work',10]],
  work:'Your chest and the backs of your arms. The core keeps your body straight.',
  stretch:'',
  fix:'If your low back sags, squeeze your glutes. If the wrist or elbow complains, put your hands on a counter.'},
 goblet:{zones:[['hip','kn',.5,'work',16],['hip','hip',0,'work',12]],
  work:'The front of your thighs and your glutes.',
  stretch:'',
  fix:'If your low back rounds at the bottom, don’t go as deep. Push your knees out over your toes.'},
 row:{zones:[['sh','hip',.2,'work',14]],
  work:'Between your shoulder blades.',
  stretch:'',
  fix:'If it’s mostly the front of the elbow or biceps, use a lighter band and think about pulling with your elbows, not your hands.'},
 pallof:{zones:[],
  work:'Your core and the sides of your waist, working to stop the band from turning you.',
  stretch:'',
  fix:'If only your arms get tired, step farther from the anchor and brace before you press. Stop if it pulls in the groin.'}
};
var WHY={
 slrdl:{goal:'Hamstring and glute strength, one leg at a time, plus hip balance.',why:'Strong glutes steady the pelvis and take load off the low back. Working each leg alone shows and evens out a weaker side, which matters with your right-side low back and glute soreness.',tag:'Low back · hip'},
 hinge:{goal:'Learn to bend and lift from the hips, not the low back.',why:'The hip hinge is how you should pick anything up. Loading it lightly with a backpack builds the pattern and the hamstrings and glutes behind it, and prepares you for dumbbell RDLs at the gym.',tag:'Low back · lifting'},
 slbridge:{goal:'Glute strength on each side, with almost no load on the spine.',why:'Glutes that fire well stabilize the hip and back. Doing one leg at a time makes it easy to notice if the right side is lagging.',tag:'Hip · low back'},
 bridge:{goal:'Glute strength with very little back load.',why:'Builds the hip-extension strength that supports your low back and hip, and is easy to progress with load.',tag:'Hip · low back'},
 split:{goal:'Single-leg strength for the thigh and glute, and knee and hip control.',why:'Most daily effort (stairs, crouching, getting up) is one leg at a time. It builds the front leg while gently opening the hip flexor of the back leg.',tag:'Legs · knee · hip'},
 dips:{goal:'Side-core strength (obliques) and the side of the hip.',why:'Rebuilds the side of the trunk gradually, without twisting, as the oblique heals. It also trains the hip muscles that keep the pelvis level when you walk.',tag:'Obliques · pelvis'},
 taps:{goal:'Teach the trunk to resist twisting.',why:'Anti-rotation work strengthens the core in the way that protects the oblique and groin. It\u2019s the safe alternative to loaded twisting, which you\u2019re still avoiding.',tag:'Core · anti-twist'},
 pushup:{goal:'Upper-body pushing strength.',why:'Balances the program with upper-body work, and the body-straight position is a moving plank for the core.',tag:'Upper body · core'},
 goblet:{goal:'Leg strength on both sides with an upright back.',why:'Holding the weight in front keeps the torso tall, so the legs and glutes work and the low back stays out of it. It\u2019s the base for heavier squats later.',tag:'Legs · glutes'},
 row:{goal:'Upper-back strength and posture.',why:'Balances the pushing work and helps posture during long days at a desk or driving. Keep it light if the front of the elbow complains.',tag:'Upper back'},
 pallof:{goal:'Core strength against rotation.',why:'Trains the obliques by resisting a twist instead of making one, which builds them without stressing the healing area.',tag:'Core · anti-twist'}
};
function whyFor(name){var k=animFor(name);if(!k&&/pallof/i.test(name||''))k='pallof';return k?WHY[k]:null;}
function feelFor(name){var k=animFor(name);if(!k&&/pallof/i.test(name||''))k='pallof';return k?FEELS[k]:null;}
function perSide(n){return /single-leg|split|side plank|shoulder tap|pallof/i.test(n||'');}

/* ---------- helpers ---------- */
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return n<10?'0'+n:''+n;}
function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function parseD(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]);}
function addDays(d,n){var x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()+n);return x;}
function today(){return iso(new Date(Date.now()-4*3600e3));} /* before 4 AM counts for the previous day */
function mondayOf(d){return addDays(d,-((d.getDay()+6)%7));}
function wd(k){return parseD(k).toLocaleDateString('en-CA',{weekday:'short'});}
function longDay(k){return parseD(k).toLocaleDateString('en-CA',{weekday:'short',month:'short',day:'numeric'});}
function daysBetween(a,b){return Math.round((parseD(b)-parseD(a))/864e5);}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function parseReps(r){var m=String(r||'').match(/(\d+)\s*[-–to]*\s*(\d+)?/);if(!m)return [8,12];var lo=+m[1],hi=m[2]?+m[2]:lo;return [Math.min(lo,hi),Math.max(lo,hi)];}
function repStr(r){var p=parseReps(r);return p[0]===p[1]?''+p[0]:p[0]+'–'+p[1];}
function toRows(arr){return arr.map(function(a){return {id:uid(),session:a[0],slot:a[1],exercise:a[2],sets:a[3],reps:a[4],next:a[5],cue:a[6],active:a[7]};});}

/* ---------- state: the program lives in the app (synced to the sheet's Program tab);
   each day's physio is part of that day's entry, like the dials ---------- */
var App=window.DailyDials||null;
var S={program:[],logs:[],declined:{},pref:null};
var UI={screen:'tab',open:{},row:null,cur:null,banner:null,edit:null,paste:false,confirm:null,openLog:null};
var loaded=true;
var PROG_KEYS=['session','slot','exercise','sets','reps','next','cue','active','load'];
function cleanRow(r){var o={};PROG_KEYS.forEach(function(k){o[k]=r[k];});o.sets=+o.sets||3;o.active=o.active===true||/^(true|yes|1|y)$/i.test(String(o.active));o.load=parseFloat(o.load)||0;
  ['session','slot','exercise','reps','next','cue'].forEach(function(k){o[k]=o[k]==null?'':String(o[k]);});return o;}
function loadProgram(){
  var rows=null,raw='';
  try{raw=App?App.getProgram():localStorage.getItem('physio.program');if(raw)rows=JSON.parse(raw);}catch(e){rows=null;}
  if(!Array.isArray(rows)||!rows.length)rows=DEFAULT_PROGRAM.map(function(a){return {session:a[0],slot:a[1],exercise:a[2],sets:a[3],reps:a[4],next:a[5],cue:a[6],active:a[7],load:0};});
  if(App&&!(raw||'').length)try{App.initProgram(JSON.stringify(rows.map(cleanRow)));}catch(e){}
  var old=S.program;
  S.program=rows.map(function(r,i){var c=cleanRow(r);var same=old.filter(function(o){return o.session===c.session&&o.slot===c.slot&&o.exercise===c.exercise;})[0];c.id=same?same.id:uid();return c;});
}
function saveProgram(){
  var json=JSON.stringify(S.program.map(cleanRow));
  if(App)App.setProgram(json);else try{localStorage.setItem('physio.program',json);}catch(e){}
}
function loadMeta(){try{var m=JSON.parse(localStorage.getItem('physio.meta')||'{}');S.declined=m.declined||{};S.pref=m.pref||null;}catch(e){}}
function saveMeta(){try{localStorage.setItem('physio.meta',JSON.stringify({declined:S.declined,pref:S.pref}));}catch(e){}}
function status(){}
function sortLogs(){S.logs.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0;});}
function drop(){}
/* rebuild the strength logs from the day entries */
function refreshLogs(){
  var out=[];
  Object.keys(entries).sort().forEach(function(d){var e=entries[d];if(!e||(!e.physio_moves&&!e.strength_feel))return;
    var mv=[];try{mv=JSON.parse(e.physio_moves||'[]');}catch(x){mv=[];}
    out.push({id:d,t:Date.parse(e.updatedAt||'')||0,date:d,letter:e.strength||'A',feel:e.strength_feel||null,moves:Array.isArray(mv)?mv:[]});});
  S.logs=out;
}
function saveDay(d){entries[d]=Object.assign({},entries[d],{date:d});pending.add(d);if(typeof setStatus==='function')setStatus('Saving\u2026');drain();}
function setKey(d,k,v){var e=Object.assign({},entries[d]);if(v==null||v==='')delete e[k];else e[k]=v;entries[d]=e;}
/* ---------- derived ---------- */
function selDay(){return current;}
function activeRows(letter){return S.program.filter(function(r){return r.active&&r.session===letter;});}
function dayLog(k){for(var i=S.logs.length-1;i>=0;i--)if(S.logs[i].date===k)return S.logs[i];return null;}
function repsOf(m){return (m.reps||[]).filter(function(x){return x!=null;});}
function nextLetter(k){
  var prev=null;
  for(var i=S.logs.length-1;i>=0;i--)if(S.logs[i].date<k&&S.logs[i].moves.length){prev=S.logs[i];break;}
  return prev&&prev.letter==='A'?'B':'A';
}
function letterFor(k){
  var L=dayLog(k);if(L)return L.letter;
  if(S.pref&&S.pref.date===k)return S.pref.letter;
  return nextLetter(k);
}
function lastFor(ex,before){
  var e=(ex||'').toLowerCase();before=before||'9999-99-99';
  for(var i=S.logs.length-1;i>=0;i--){var L=S.logs[i];if(L.date>=before)continue;
    for(var j=0;j<L.moves.length;j++){var m=L.moves[j];if(m.exercise.toLowerCase()===e&&repsOf(m).length)return {log:L,move:m};}}
  return null;
}
function setsStr(reps,load){if(!reps.length)return '';var same=reps.every(function(r){return r===reps[0];});return (same?reps.length+' × '+reps[0]:reps.join(', '))+(load>0?' @ '+fmtLb(load)+' lb':'');}
function fmtLb(v){v=Math.round(v*10)/10;return (v%1?v.toFixed(1):String(v));}
function lastStr(m){return setsStr(repsOf(m),m.load||0);}
function weekStats(){
  var t=today(),mon=iso(mondayOf(parseD(t))),n=0,mob=0;
  S.logs.forEach(function(L){if(L.date>=mon&&L.date<=t&&L.moves.length)n++;});
  for(var i=0;i<7;i++){var k=iso(addDays(parseD(mon),i));if(mobDone(k))mob++;}
  return {n:n,mob:mob};
}
function suggestions(){
  var t=today();
  if(S.logs.some(function(L){return L.feel==='too'&&daysBetween(L.date,t)<7;}))return [];
  var out=[];
  S.program.forEach(function(r){
    if(!r.active)return;
    var lf=lastFor(r.exercise);if(!lf||lf.log.feel==='too'||loadChanged(r,lf))return;
    var hi=parseReps(r.reps)[1],sets=+r.sets||3,reps=repsOf(lf.move),ld=lf.move.load||0;
    if(reps.length<sets||!reps.every(function(x){return x>=hi;}))return;
    if(S.declined[r.id]===lf.log.id)return;
    if(ld>0)out.push({kind:'load',row:r,log:lf.log,to:ld+5,yes:'Add 5 lb',text:r.exercise+': you hit '+sets+' × '+hi+' at '+fmtLb(ld)+' lb and it wasn\u2019t too much. Next time, '+fmtLb(ld+5)+' lb (reps start back at '+parseReps(r.reps)[0]+')?'});
    else if(r.next)out.push({kind:'rung',row:r,log:lf.log,yes:'Move up',text:r.exercise+': you hit '+sets+' × '+hi+' last time and it wasn\u2019t too much. Next time, move up to '+r.next+'?'});
  });
  return out;
}

/* ---------- a day's log ---------- */
function ensureLog(k){
  var L=dayLog(k);
  if(!L){L={id:uid(),t:Date.now(),date:k,letter:letterFor(k),feel:null,moves:[]};S.logs.push(L);sortLogs();}
  return L;
}
function storeLog(L){
  var d=L.date,has=L.moves.length>0;
  setKey(d,'physio_moves',has||L.feel?JSON.stringify(L.moves.map(function(m){return {slot:m.slot,exercise:m.exercise,sets:m.reps.length,lo:m.lo,hi:m.hi,load:m.load||0,reps:m.reps};})):null);
  setKey(d,'strength',has?L.letter:null);
  setKey(d,'strength_done',has?L.moves.filter(function(m){return repsOf(m).length;}).length:null);
  setKey(d,'strength_feel',L.feel||null);
  if(!has&&!L.feel)S.logs=S.logs.filter(function(x){return x!==L;});
  saveDay(d);
}
function entryFor(L,row){if(!L)return null;var i,e=row.exercise.toLowerCase();for(i=0;i<L.moves.length;i++)if(L.moves[i].rowId===row.id)return L.moves[i];for(i=0;i<L.moves.length;i++)if(L.moves[i].exercise.toLowerCase()===e&&L.moves[i].slot===row.slot)return L.moves[i];return null;}
function loadChanged(row,lf){return !!lf&&(+row.load||0)>(lf.move.load||0);}
function startReps(row,k){var lf=lastFor(row.exercise,k);return lf&&!loadChanged(row,lf)?repsOf(lf.move)[0]:parseReps(row.reps)[0];}
function startLoad(row,k){var lf=lastFor(row.exercise,k),rl=+row.load||0;if(loadChanged(row,lf))return rl;return lf?(lf.move.load||0):rl;}
function newEntry(row){var lr=parseReps(row.reps),n=Math.max(1,Math.min(8,+row.sets||3));
  return {rowId:row.id,slot:row.slot,exercise:row.exercise,sets:n,lo:lr[0],hi:lr[1],load:startLoad(row,selDay()),reps:new Array(n).fill(null)};}
function orderMoves(L){var ids=S.program.map(function(r){return r.id;});L.moves.sort(function(a,b){return ids.indexOf(a.rowId)-ids.indexOf(b.rowId);});}
function pend(row){var k=selDay(),key=k+'|'+row.id;UI.pend=UI.pend||{};
  if(!UI.pend[key]){var e=entryFor(dayLog(k),row);
    if(e){var rr=repsOf(e);UI.pend[key]={s:e.reps.length,r:rr.length?rr[rr.length-1]:startReps(row,k),l:e.load||0};}
    else UI.pend[key]={s:Math.max(1,Math.min(10,+row.sets||3)),r:startReps(row,k),l:startLoad(row,k)};}
  return UI.pend[key];}
function vals(row){var q=pend(row),e=entryFor(dayLog(selDay()),row);return {s:q.s,r:q.r,l:q.l,done:!!e};}
function makeEntry(row,fill){var q=pend(row),lr=parseReps(row.reps);
  return {rowId:row.id,slot:row.slot,exercise:row.exercise,sets:q.s,lo:lr[0],hi:lr[1],load:q.l||0,reps:new Array(q.s).fill(fill?q.r:null)};}
function toggleMove(row){
  var k=selDay(),L=ensureLog(k),e=entryFor(L,row);
  if(e)L.moves.splice(L.moves.indexOf(e),1);
  else{L.moves.push(makeEntry(row,true));orderMoves(L);}
  storeLog(L);render();
}
function logAll(row){var k=selDay(),L=ensureLog(k),e=entryFor(L,row),q=pend(row);
  if(!e){e=makeEntry(row,true);L.moves.push(e);orderMoves(L);}else e.reps=e.reps.map(function(x){return x==null?q.r:x;});
  storeLog(L);}
function setCheck(row,i){var k=selDay(),L=ensureLog(k),e=entryFor(L,row),q=pend(row);
  if(!e){e=makeEntry(row,false);L.moves.push(e);orderMoves(L);}
  e.reps[i]=e.reps[i]==null?q.r:null;
  if(!repsOf(e).length)L.moves.splice(L.moves.indexOf(e),1);
  storeLog(L);render();}
function adjust(row,which,d,setTo){
  var k=selDay(),L=dayLog(k),e=entryFor(L,row),q=pend(row);
  if(which==='s'){q.s=Math.max(1,Math.min(10,q.s+d));if(e){while(e.reps.length<q.s)e.reps.push(null);e.reps=e.reps.slice(0,q.s);e.sets=q.s;if(!repsOf(e).length)L.moves.splice(L.moves.indexOf(e),1);}}
  else if(which==='r'){q.r=Math.max(0,Math.min(99,q.r+d));if(e)e.reps=e.reps.map(function(x){return x==null?null:q.r;});}
  else{q.l=setTo!=null?setTo:Math.max(0,Math.min(999,(q.l||0)+d));if(e)e.load=q.l;}
  if(e)storeLog(L);render();
}
function nudge(row,d){
  var k=selDay(),L=dayLog(k),e=entryFor(L,row);if(!e)return;
  var r=repsOf(e),v=Math.max(0,Math.min(99,(r.length?r[r.length-1]:startReps(row,k))+d));
  e.reps=e.reps.map(function(){return v;});storeLog(L);render();
}
function moveUp(s){
  if(s.kind==='load'){s.row.load=s.to;s.row.loadSince=Date.now();saveProgram();UI.banner=[s.row.exercise+': next time '+fmtLb(s.to)+' lb.','var(--lgreen)'];render();return;}
  var r=s.row,want=r.next.toLowerCase(),found=null;
  S.program.forEach(function(x){if(x.session===r.session&&x.slot===r.slot&&x.exercise.toLowerCase()===want)found=x;});
  if(!found){found={id:uid(),session:r.session,slot:r.slot,exercise:r.next,sets:r.sets,reps:r.reps,next:'',cue:'',active:true};S.program.push(found);}
  r.active=false;found.active=true;
  S.program.splice(S.program.indexOf(found),1);S.program.splice(S.program.indexOf(r),0,found);
  saveProgram();
  UI.banner=['Moved up. Session '+r.session+' now uses '+found.exercise+'.','var(--lgreen)'];
  render();
}
function twoTap(key,fn){if(UI.confirm===key){UI.confirm=null;fn();}else{UI.confirm=key;render();setTimeout(function(){if(UI.confirm===key){UI.confirm=null;render();}},3500);}}
function copyText(txt,okMsg){
  function fallback(){UI.copyBox=txt;render();}
  try{navigator.clipboard.writeText(txt).then(function(){UI.banner=[okMsg,'var(--lgreen)'];UI.copyBox=null;render();},fallback);}catch(e){fallback();}
}
function programTSV(){
  var h=['session','slot','exercise','sets','reps','next rung','cue','active','load lb'];
  return [h.join('\t')].concat(S.program.map(function(r){return [r.session,r.slot,r.exercise,r.sets,r.reps,r.next,r.cue,r.active?'TRUE':'FALSE',+r.load>0?r.load:''].map(function(c){return String(c==null?'':c).replace(/[\t\n]/g,' ');}).join('\t');})).join('\n');
}
function logTSV(){
  var out=[['date','session','slot','exercise','set','reps','load lb','target','feel'].join('\t')];
  S.logs.forEach(function(L){L.moves.forEach(function(m){
    var tg=m.sets+'x'+(m.lo===m.hi?m.lo:m.lo+'-'+m.hi);
    repsOf(m).forEach(function(r,i){out.push([L.date,L.letter,m.slot,m.exercise,i+1,r,m.load>0?m.load:'',tg,L.feel||''].join('\t'));});});});
  return out.join('\n');
}
function parsePaste(txt){
  var rows=[];
  txt.split(/\r?\n/).forEach(function(line){
    if(!line.trim())return;var c=line.split('\t');
    if(c[0].trim().toLowerCase()==='session')return;
    if(c.length<3||!c[2].trim())return;
    var s=c[0].trim();if(!s||/daily/i.test(s))return;
    rows.push({id:uid(),session:s.toUpperCase(),slot:(c[1]||'').trim(),exercise:c[2].trim(),sets:+(c[3]||3)||3,reps:(c[4]||'8-12').trim(),next:(c[5]||'').trim(),cue:(c[6]||'').trim(),active:/^(true|yes|1|y)$/i.test((c[7]||'TRUE').trim()),load:parseFloat(c[8])||0});
  });
  return rows;
}

/* ---------- render ---------- */
var app=document.getElementById('physioApp');
function render(){
  if(!app)return;
  refreshLogs();
  A.els=null;
  if(UI.screen==='move'&&rowById(UI.row))return renderMove();
  if(UI.screen==='program')return renderProgram();
  UI.screen='tab';renderTab();
}
function dayLabel(k){var t=today();if(k===t)return 'Today';if(k===iso(addDays(parseD(t),-1)))return 'Yesterday';return longDay(k);}
function cardioOf(k){var e=entries[k];if(!e||+e.cardio!==1)return null;return {min:+e.cardio_min||0,int:e.cardio_intensity||''};}
function cardioDraft(k){UI.cd=UI.cd||{};var c=cardioOf(k);if(c&&c.min){UI.cd[k]=UI.cd[k]&&UI.cd[k].min===c.min&&UI.cd[k].int===c.int?UI.cd[k]:{min:c.min,int:c.int};return UI.cd[k];}if(!UI.cd[k]){var last=null;Object.keys(entries).sort().forEach(function(x){var o=cardioOf(x);if(o&&o.min&&x<k)last=o;});UI.cd[k]={min:last?last.min:30,int:last?last.int:'Moderate'};}return UI.cd[k];}
function mobDone(k){return !!entries[k]&&+entries[k].mobility===1;}
var RC='<span class="rc" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>';
function stepper(act,id,val,unit,lbl){
  return '<span class="sr"><button data-act="'+act+'" data-d="-1" data-id="'+id+'" aria-label="Fewer '+lbl+'">&#8722;</button><span class="sv"><b>'+val+'</b> '+unit+'</span><button data-act="'+act+'" data-d="1" data-id="'+id+'" aria-label="More '+lbl+'">+</button></span>';
}
var GLYPHS={hinge:{h:[33,11],l:[[16,19,29,14,4.2],[16,19,17,28],[17,28,16,37],[16,19,6,22],[28,14,28,24,2.6]]},
 bridge:{h:[5,31],l:[[9,32,22,25,4.2],[22,25,30,21],[30,21,32,36],[10,32,18,35,2.6]]},
 split:{h:[20,5],l:[[20,10,20,22,4.2],[20,22,28,27],[28,27,28,37],[20,22,13,31],[13,31,6,36]]},
 side:{h:[7,15],l:[[10,20,24,27,4.2],[24,27,36,33],[10,20,10,31,2.6],[10,31,17,31,2.6]]},
 plank:{h:[5,19],l:[[10,22,25,27,4.2],[25,27,37,33],[10,22,10,35,2.6]]},
 squat:{h:[23,5],l:[[22,10,18,23,4.2],[18,23,28,25],[28,25,26,37],[22,13,28,16,2.6]]},
 stand:{h:[20,5],l:[[20,10,20,24,4.2],[20,24,16,37],[20,24,24,37],[20,13,31,15,2.6]]}};
var GMAP={slrdl:'hinge',hinge:'hinge',slbridge:'bridge',bridge:'bridge',split:'split',goblet:'squat',dips:'side',taps:'plank',pushup:'plank',row:'stand'};
function glyphSvg(name,size){var G=GLYPHS[GMAP[animFor(name)]||'stand'];
  return '<svg viewBox="0 0 40 40" width="'+size+'" height="'+size+'" aria-hidden="true" fill="none" stroke="#3a2d24" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="38.5" x2="39" y2="38.5" stroke="#cdbfb0" stroke-width="1.4"/>'+
    G.l.map(function(a){return '<line x1="'+a[0]+'" y1="'+a[1]+'" x2="'+a[2]+'" y2="'+a[3]+'" stroke-width="'+(a[4]||3.2)+'"/>';}).join('')+'<circle cx="'+G.h[0]+'" cy="'+G.h[1]+'" r="3.6" fill="#3a2d24" stroke="none"/></svg>';}
var CHEVR='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#9a8a7e" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
var CHEV='<svg class="chev" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var TICKS='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function panel(p,title,items,store,k,isToday){
  var done=mobDone(k),open=!!UI.open[p],picked=items.filter(function(m){return visOn(k,p,m[0]);}).map(function(m){return m[1];});
  var sub=(done?(isToday?'Done today':'Done'):(isToday?'Not yet today':'Not marked'))+(picked.length?' · '+picked.join(', '):'');
  var h='<section class="card pnl'+(done?' done':'')+(open?' open':'')+'"><div class="srow top"><button class="sopen" data-act="expand" data-p="'+p+'" aria-expanded="'+open+'"><span class="nm">'+title+'<small>'+esc(sub)+'</small></span>'+CHEV+'</button>'+
    '<button class="tickb" data-act="pdone" data-p="'+p+'" role="switch" aria-checked="'+done+'" aria-label="'+title+' done">'+RC+'</button></div>';
  if(open){
    h+='<div class="vlist">'+items.map(function(m){var on=visOn(k,p,m[0]);
      return '<button class="vitem" data-act="vis" data-p="'+p+'" data-k="'+m[0]+'" aria-pressed="'+on+'"><span class="vb">'+(on?TICKS:'')+'</span><span><b>'+esc(m[1])+'</b>'+(m[2]?'<small>'+esc(m[2])+'</small>':'')+'</span></button>';}).join('')+
      '<div class="small" style="padding:6px 2px 0">These ticks are just for you today. The round check is what gets logged.</div></div>';
  }
  return h+'</section>';
}
var PLAYI='<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" style="vertical-align:-1px"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
var PHASES=[
 {n:1,name:'Rebuild',when:'Now → mid-December',
  why:'Get the back, hips and obliques used to regular work again without flare-ups. Reps before weight.',
  week:'3 strength sessions (A, B, A… any days) · mobility every day · cardio 3× 20–30 min, easy to moderate (walk, bike).',
  A:[['Single-leg RDL','hamstrings and glutes, one side at a time'],['Single-leg glute bridge','glute on each side, almost no spine load'],['Split squat','front-leg strength, knee and hip control'],['Side plank hip dips','obliques without twisting'],['Plank shoulder taps','core that resists twisting']],
  B:[['Backpack RDL','the hip hinge with light load'],['Goblet squat','both legs, upright back'],['Band row','upper back and posture'],['Pallof press','anti-rotation core'],['Push-up','upper-body push']],
  aim:'3 sessions a week for 4 weeks · top of the rep range on most moves · no “too much” in the last 2 weeks · back pain mostly 2 or less.'},
 {n:2,name:'Load',when:'Mid-December → end of February',
  why:'Same patterns, now with dumbbells and cables at the gym so strength actually builds. Add 5 lb whenever you hit the top of the range twice.',
  week:'3 strength sessions · mobility most days · cardio 3× 30 min, one of them harder.',
  A:[['Dumbbell single-leg RDL',''],['Hip thrust with weight',''],['Rear-foot-elevated split squat',''],['Side plank with reach',''],['Bear-crawl shoulder taps','']],
  B:[['Dumbbell RDL',''],['Dumbbell goblet squat',''],['Cable or seated row',''],['Cable Pallof press',''],['Dumbbell bench press or feet-raised push-up','']],
  aim:'Weights going up every couple of weeks with no flare-ups · physiatrist review done.'},
 {n:3,name:'Strength',when:'March onward',
  why:'Long-term general strength: heavier lifts, pulling and carrying. Rotation only once it’s cleared.',
  week:'3 strength sessions · mobility as a warm-up · cardio 150 min a week.',
  A:[['Trap-bar deadlift',''],['Bulgarian split squat',''],['Lat pulldown, then assisted pull-ups',''],['Suitcase carry',''],['Side plank variations','']],
  B:[['Heavier goblet or front squat',''],['Heavy hip thrust',''],['One-arm dumbbell row',''],['Overhead press, if the shoulder is happy',''],['Rotation work, if Dr. Delaney clears it','']],
  aim:'Review every 6 weeks and pick new targets.'}];
function historyGrid(){
  var t=today(),days=[],i;
  for(i=13;i>=0;i--)days.push(iso(addDays(parseD(t),-i)));
  var P=(typeof METRICS!=='undefined')?METRICS.filter(function(m){return m.key==='pain';})[0]:null;
  var g='';
  function cell(d,bg,lab){return '<span class="cell" role="img" aria-label="'+esc(lab+', '+longDay(d))+'"'+(bg?' style="background:'+bg+'"':'')+'></span>';}
  function pill(c,txt){return '<div class="av" style="--c:'+c+'">'+txt+'</div>';}
  function row(name,cellFn,pillFn){g+='<div class="lbl">'+name+'</div>';days.forEach(function(d,j){if(j===7)g+=pillFn(days.slice(0,7))+'<div></div>';g+=cellFn(d);});g+=pillFn(days.slice(7));}
  var top=STOPS[5],mid=STOPS[4],part=STOPS[3],warn=STOPS[2];
  row('Mobility',function(d){return cell(d,mobDone(d)?top:'',mobDone(d)?'Mobility done':'No mobility');},
    function(ds){var n=ds.filter(mobDone).length;return pill(colour(n/7),n+'/7');});
  row('Cardio',function(d){var c=cardioOf(d);return cell(d,c?(c.int==='Easy'?mid:top):'',c?'Cardio '+(c.min||'')+' min':'No cardio');},
    function(ds){var m=0;ds.forEach(function(d){var c=cardioOf(d);if(c)m+=c.min||0;});return pill(m?colour(Math.min(1,m/120)):'var(--empty)',m?m+'′':'–');});
  row('Strength',function(d){var L=dayLog(d);if(!L||!L.moves.length)return cell(d,'','No strength');var n=activeRows(L.letter).length;
      return cell(d,L.feel==='too'?warn:L.moves.length<n?part:top,'Session '+L.letter+(L.feel==='too'?', too much':''));},
    function(ds){var n=ds.filter(function(d){var L=dayLog(d);return L&&L.moves.length;}).length;return pill(colour(Math.min(1,n/3)),n+'/3');});
  if(P)row(esc(P.short||P.name),function(d){var v=entries[d]&&entries[d].pain;return (v==null||v==='')?cell(d,'','No entry'):cell(d,colour(goodness(P,+v)),P.name+' '+v);},
    function(ds){var vs=ds.map(function(d){return entries[d]&&entries[d].pain;}).filter(function(v){return v!=null&&v!=='';}).map(Number);
      var a=vs.length?vs.reduce(function(x,y){return x+y;},0)/vs.length:null;return pill(a==null?'var(--empty)':colour(goodness(P,a)),a==null?'–':a.toFixed(1));});
  var wk=function(a,b){return shortDay(a)+' – '+parseD(b).getDate();};
  return '<section class="card ptrend"><div class="tt" style="margin:0 0 10px"><span class="t1">Last 2 weeks</span></div><div class="grid">'+g+'</div>'+
    '<div class="gaxis"><span></span><span style="grid-column:span 7">'+wk(days[0],days[6])+'</span><span>'+'</span><span></span><span style="grid-column:span 7">'+wk(days[7],days[13])+'</span><span></span></div></section>';
}
function cardioPanel(k,isToday){
  var c=cardioOf(k),done=!!c,open=!!UI.open.cardio,d=cardioDraft(k);
  var sub=done?(isToday?'Done today':'Done')+(c.min?' \u00b7 '+c.min+' min \u00b7 '+c.int:''):(isToday?'Not yet today':'Not marked');
  var h='<section class="card pnl'+(done?' done':'')+(open?' open':'')+'"><div class="srow top"><button class="sopen" data-act="expand" data-p="cardio" aria-expanded="'+open+'"><span class="nm">Cardio<small>'+esc(sub)+'</small></span>'+CHEV+'</button>'+
    '<button class="tickb" data-act="cdone" role="switch" aria-checked="'+done+'" aria-label="Cardio done">'+RC+'</button></div>';
  if(open){
    h+='<div class="cbody"><div class="prw"><span class="lbl">Time</span>'+stepper('cmin','x',d.min,'min','minutes')+'</div>'+
      '<div class="lbl" style="margin-top:4px">Intensity</div><div class="pseg" role="radiogroup" aria-label="Intensity">'+
      ['Easy','Moderate','Hard'].map(function(n){return '<button data-act="cint" data-v="'+n+'" role="radio" aria-checked="'+(d.int===n)+'">'+n+'</button>';}).join('')+'</div>'+
      '<div class="small">'+({Easy:'Easy: you could sing.',Moderate:'Moderate: you can talk, not sing.',Hard:'Hard: only a few words at a time.'})[d.int]+'</div></div>';
  }
  return h+'</section>';
}
function renderTab(){
  var k=selDay(),isToday=k===today(),letter=letterFor(k),rows=activeRows(letter),L=dayLog(k);
  var h='';
  h+=historyGrid();
  if(UI.banner)h+='<div class="banner" style="background:'+UI.banner[1]+'">'+esc(UI.banner[0])+'</div>';
  h+=panel('mob','Mobility',MOB,null,k,isToday)+cardioPanel(k,isToday);

  var done=L?L.moves.length:0;
  h+='<section class="card strc"><div class="prw" style="padding:0 16px 6px"><span class="t1">Strength \u00b7 Session '+esc(letter)+'</span><span class="small">'+done+' of '+rows.length+'</span></div>';
  if(!rows.length)h+='<div class="small" style="padding:6px 16px">No active moves in Session '+esc(letter)+'. Add some in Program.</div>';
  rows.forEach(function(r,ri){
    var e=entryFor(L,r),lf=lastFor(r.exercise,k),sub;
    if(e){var rr=repsOf(e);sub=setsStr(rr,e.load||0)+(rr.length<e.reps.length?' \u00b7 '+rr.length+' of '+e.reps.length+' sets':'');}
    else sub='Target '+r.sets+' \u00d7 '+repStr(r.reps)+(lf?' \u00b7 last '+lastStr(lf.move):(+r.load>0?' @ '+fmtLb(+r.load)+' lb':''));
    h+='<div class="srow mrow'+(ri===0?' first':'')+(e?' done':'')+'"><button class="sopen" data-act="open" data-id="'+r.id+'"><span class="thumb">'+glyphSvg(r.exercise,30)+'</span><span class="nm">'+esc(r.exercise)+'<small>'+esc(sub)+'</small></span>'+CHEVR+'</button>'+
      '<button class="tickb" data-act="tick" data-id="'+r.id+'" role="switch" aria-checked="'+!!e+'" aria-label="'+esc(r.exercise)+' done">'+RC+'</button></div>';
  });
  if(L&&L.moves.length){
    h+='<div class="prw feelrow"><span class="small">How did it feel?</span><span class="fchips">'+
      ['easy','right','too'].map(function(f){return '<button class="fchip f-'+f+'" data-act="feel" data-v="'+f+'" aria-pressed="'+(L.feel===f)+'">'+FEEL[f]+'</button>';}).join('')+'</span></div>';
  }else{
    h+='<div class="prw feelrow"><span class="small">Tap a move for how and why.</span><button class="link" data-act="swap">Do '+(letter==='A'?'B':'A')+' instead</button></div>';
  }
  var sg=suggestions();
  h+='<button class="planrow" data-act="plan"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="#6b4f3f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16"/><path d="M7 15l4-4 3 3 5-6"/></svg>'+
    '<span class="nm" style="flex:1;font-size:15px">Plan details<small>Phase 1 of 3 \u00b7 Rebuild'+(sg.length?' \u00b7 '+sg.length+' ready to step up':'')+'</small></span>'+CHEVR+'</button></section>';
  if(sg.length){var s=sg[0];
    h+='<section class="sugg"><div style="font:500 16px var(--head)">Ready to move up'+(sg.length>1?' <span class="small">\u00b7 1 of '+sg.length+'</span>':'')+'</div><div style="font-size:14px">'+esc(s.text)+'</div><div class="btns"><button class="pill" style="min-height:40px;font-size:14px" data-act="up">'+s.yes+'</button><button class="ghost" data-act="notyet">Not yet</button></div></section>';}
  h+='<div class="prw" style="padding:0 4px"><span class="small">Moves come from the Program tab in your sheet.</span><button class="link" data-act="program">Program</button></div>';
  if(!loaded)h+='<p class="small" style="text-align:center">Loading your saved data\u2026</p>';
  var sh=UI.sheet&&rowById(UI.sheet);
  if(sh)h+=sheet(sh);else if(UI.planOpen)h+=planSheet();
  app.innerHTML=h;
  document.body.style.overflow=(sh||UI.planOpen)?'hidden':'';
  if(sh){var ak=animFor(sh.exercise),fi=feelFor(sh.exercise);setupFig(ak,fi&&ak?fi.zones:[]);}
  if((sh||UI.planOpen)&&UI.focusSheet){var c=document.getElementById('sheetClose');if(c)c.focus();UI.focusSheet=false;}
}
function planSheet(){
  var tab=UI.ptab||'Roadmap';
  var h='<div class="scrim'+(UI.focusSheet?' in':'')+'" data-act="closeplan"></div><section class="sheet'+(UI.focusSheet?' in':'')+'" role="dialog" aria-modal="true" aria-label="Your strength plan"><div class="grab" aria-hidden="true"></div>'+
    '<div class="shead"><h2>Your strength plan</h2><button id="sheetClose" class="xbtn" data-act="closeplan" aria-label="Close">&#215;</button></div>'+
    '<div class="pseg" role="tablist" aria-label="Plan sections" style="grid-template-columns:1fr 1fr">'+['Roadmap','Moves'].map(function(t){return '<button data-act="ptab" data-v="'+t+'" role="tab" aria-selected="'+(t===tab)+'" aria-checked="'+(t===tab)+'">'+t+'</button>';}).join('')+'</div>';
  if(tab==='Roadmap'){
    h+='<div class="rulebox"><div class="lbl">Sessions vs phases</div><p><b>Session A and B</b> are two different workouts at the same level. You alternate them: log A today and your next strength day shows B. <b>Phases</b> are the months-long plan: each phase swaps in harder versions of the moves.</p></div>';
    h+=PHASES.map(function(p){
      var list=function(L){return '<ul class="plist">'+L.map(function(x){return '<li><b>'+esc(x[0])+'</b>'+(x[1]?' \u2014 '+esc(x[1]):'')+'</li>';}).join('')+'</ul>';};
      return '<div class="phase'+(p.n===1?' on':'')+'"><div class="prw"><b>Phase '+p.n+' \u00b7 '+p.name+'</b>'+(p.n===1?'<span class="here">You are here</span>':'')+'</div><div class="pwhen">'+p.when+'</div>'+
        '<p>'+esc(p.why)+'</p><p class="ex">'+esc(p.week)+'</p><div class="psub">Session A</div>'+list(p.A)+'<div class="psub">Session B</div>'+list(p.B)+
        '<p class="ex"><b>Ready to move on when:</b> '+esc(p.aim)+'</p></div>';}).join('')+
      '<p class="small">My draft from what you\u2019ve told me, not medical advice. Go over it with your physio.</p>';
  }else{
    h+='<div class="rulebox"><div class="lbl">The rule for every move</div><p>Add reps until every set hits the top of the range. Do it twice, nothing \u201ctoo much\u201d, and the next step unlocks: +5 lb, or the next rung if it can\u2019t take weight. Two \u201ctoo much\u201d in a row: step back.</p></div>';
    var seen={};
    S.program.forEach(function(r){if(!r.active)return;var key=r.session+'|'+r.slot;if(seen[key])return;seen[key]=1;
      var lad=S.program.filter(function(x){return x.session===r.session&&x.slot===r.slot;}),names=lad.map(function(x){return x.exercise;});
      if(r.next&&names.map(function(x){return x.toLowerCase();}).indexOf(r.next.toLowerCase())<0)lad=lad.concat([{exercise:r.next,active:false,ghost:true}]);
      var ci=lad.indexOf(r);
      h+='<div class="ladder"><div class="prw"><span class="lbl">'+esc(r.slot||'Move')+' \u00b7 Session '+esc(r.session)+'</span><span class="small">'+esc(r.sets)+' \u00d7 '+esc(repStr(r.reps))+'</span></div>'+
        lad.map(function(x,j){return '<div class="rung'+(j===ci?' now':j<ci?' past':'')+'"><span class="dot"></span><span style="flex:1">'+esc(x.exercise)+'</span><span class="rt">'+(j===ci?'now':j===ci+1?'next':'')+'</span></div>';}).join('')+'</div>';});
  }
  return h+'</section>';
}
/* sets/reps edits on a day's entry; creates the entry (ticks the move) if needed */
function editEntry(row,dSets,dReps,dLoad,setLoad){
  var k=selDay(),L=ensureLog(k),e=entryFor(L,row);
  if(!e){e=newEntry(row);var v0=startReps(row,k);e.reps=e.reps.map(function(){return v0;});L.moves.push(e);orderMoves(L);}
  var r=repsOf(e),n=Math.max(1,Math.min(10,r.length+(dSets||0))),v=Math.max(0,Math.min(99,(r.length?r[r.length-1]:startReps(row,k))+(dReps||0)));
  e.reps=new Array(n).fill(v);
  if(setLoad!=null)e.load=setLoad;else if(dLoad)e.load=Math.max(0,Math.min(999,(e.load||0)+dLoad));
  storeLog(L);render();
}
function loadCtl(act,id,val){
  if(!(val>0))return '<button class="addload" data-act="'+act+'" data-d="5" data-id="'+id+'">+ Load (lb)</button>';
  return '<span class="sr"><button data-act="'+act+'" data-d="-5" data-id="'+id+'" aria-label="5 lb less">&#8722;</button><span class="sv"><input class="lin" data-lact="'+act+'" data-id="'+id+'" inputmode="decimal" value="'+fmtLb(val)+'" aria-label="Load in pounds"> lb</span><button data-act="'+act+'" data-d="5" data-id="'+id+'" aria-label="5 lb more">+</button></span>';
}

/* detail sheet for one move */
function sheet(r){
  var k=selDay(),L=dayLog(k),e=entryFor(L,r),ak=animFor(r.exercise),fi=feelFor(r.exercise),w=whyFor(r.exercise),v=vals(r),lf=lastFor(r.exercise,k);
  var zones=fi&&ak?fi.zones:[],hasStretch=zones.some(function(z){return z[3]==='stretch';});
  var lastR=lf?repsOf(lf.move):[],lastL=lf?(lf.move.load||0):0;
  var h='<div class="scrim'+(UI.focusSheet?' in':'')+'" data-act="close"></div><section class="sheet'+(UI.focusSheet?' in':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(r.exercise)+'"><div class="grab" aria-hidden="true"></div>';
  h+='<div class="shead"><span class="thumb big">'+glyphSvg(r.exercise,34)+'</span><div style="flex:1;min-width:0"><div class="lbl">Session '+esc(r.session)+(r.slot?' \u00b7 '+esc(r.slot):'')+'</div><h2>'+esc(r.exercise)+'</h2></div><button id="sheetClose" class="xbtn" data-act="close" aria-label="Close">&#215;</button></div>';
  h+='<div class="prw small"><span>Target <b style="color:var(--fg)">'+esc(r.sets)+' \u00d7 '+esc(repStr(r.reps))+'</b>'+(perSide(r.exercise)?' per side':'')+'</span><span>'+(lf?'Last '+esc(lastStr(lf.move))+' \u00b7 '+wd(lf.log.date):'First time')+'</span></div>';
  h+='<div class="sedit" style="padding:0">'+stepper('xreps',r.id,v.r,'reps','reps')+loadCtl('xload',r.id,v.l)+'</div>';
  h+='<div class="stbl"><div class="sth"><span>Set</span><span>Last</span><span>Lb</span><span>Reps</span><span></span></div>';
  for(var i=0;i<v.s;i++){var on=!!(e&&e.reps[i]!=null),val=on?e.reps[i]:v.r;
    h+='<div class="str'+(on?' on':'')+'"><span class="sn">'+(i+1)+'</span><span class="sl">'+(lastR[i]!=null?(lastL?fmtLb(lastL)+' lb \u00d7 ':'\u00d7 ')+lastR[i]:'\u2014')+'</span><span class="sv2">'+(v.l>0?fmtLb(v.l):'\u2014')+'</span><span class="sv2">'+val+'</span>'+
      '<button class="tickb sm" data-act="setck" data-i="'+i+'" data-id="'+r.id+'" role="switch" aria-checked="'+on+'" aria-label="Set '+(i+1)+' done">'+RC+'</button></div>';}
  h+='</div><div class="prw"><span><button class="link" data-act="xsets" data-d="1" data-id="'+r.id+'">+ Add a set</button>'+(v.s>1?' <button class="link" data-act="xsets" data-d="-1" data-id="'+r.id+'" style="margin-left:12px">\u2212 Remove</button>':'')+'</span></div>';
  var nd=e?repsOf(e).length:0;
  h+=nd>=v.s?'<div class="sfoot2"><button class="logbtn on" data-act="close">'+TICKS+' Logged \u00b7 '+esc(setsStr(repsOf(e),e.load||0))+'</button><button class="link" data-act="tick" data-id="'+r.id+'">Undo</button></div>'
    :'<button class="logbtn" data-act="logclose" data-id="'+r.id+'">'+(nd?'Log the other '+(v.s-nd)+' set'+(v.s-nd>1?'s':''):'Log all '+v.s+' sets')+'</button>';
  if(ak){
    h+='<div class="ministage"><svg viewBox="20 20 270 190" role="img" aria-label="Figure demonstrating '+esc(r.exercise)+'. Tap to pause." data-act="playpause"><line x1="6" x2="294" y1="'+(170+ANIM[ak].dy)+'" y2="'+(170+ANIM[ak].dy)+'" stroke="var(--floor)" stroke-width="3" stroke-linecap="round"/><g id="fig" transform="translate(0,'+ANIM[ak].dy+')" fill="none" stroke-linecap="round" stroke-linejoin="round"></g></svg><div class="plabel" id="plabel"></div>'+
      (zones.length?'<div class="legend"><span><i class="lz work"></i>Should work</span>'+(hasStretch?'<span><i class="lz stretch"></i>Mild stretch OK</span>':'')+'</div>':'')+'</div>';
  }else{
    h+='<div class="ministage noanim" style="padding:14px"><div>No animation for this move yet.</div><a href="https://www.youtube.com/results?search_query='+encodeURIComponent(r.exercise+' exercise form')+'" target="_blank" rel="noopener">Watch a video</a></div>';
  }
  if(fi)h+='<div class="feelbox"><i class="lz work"></i><div><div class="flbl">Where you should feel it</div><p>'+esc(fi.work)+(fi.stretch?' '+esc(fi.stretch):'')+'</p></div></div>';
  h+='<div class="sec"><div class="lbl">How</div><p>'+esc(r.cue||'No cue yet. Add one in Program.')+'</p></div>';
  if(w)h+='<div class="sec"><div class="lbl">Why</div><p><b>'+esc(w.goal)+'</b> '+esc(w.why)+'</p></div>';
  if(fi)h+='<details class="sec"><summary>Feeling it somewhere else?</summary><p>'+esc(fi.fix)+'</p></details>';
  return h+'</section>';
}

/* guided view for one move */
var A={key:null,t:0,last:0,playing:true,els:null,zones:[]};
var reduced=false;try{reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
function resetAnim(){A.t=0;A.playing=!reduced;}
function renderMove(){
  var k=selDay(),r=rowById(UI.row),L=dayLog(k),e=entryFor(L,r),ak=animFor(r.exercise),ps=perSide(r.exercise)?' per side':'',fi=feelFor(r.exercise);
  var lr=parseReps(r.reps),n=Math.max(1,Math.min(8,+r.sets||3)),lf=lastFor(r.exercise,k);
  var vv=vals(r),cs=vv.s,cr=vv.r,cl=vv.l;
  var list=activeRows(letterFor(k)),ix=list.indexOf(r),nx=ix>-1&&ix<list.length-1?list[ix+1]:null;
  var zones=fi&&ak?fi.zones:[],hasStretch=zones.some(function(z){return z[3]==='stretch';});
  var h='<div class="prw"><button aria-label="Back" data-act="back" style="width:44px;height:44px;border:0;background:transparent;font-size:26px;color:#6b4f3f">&#8249;</button><div style="font:500 17px var(--head)">Session '+esc(r.session)+(ix>-1?' · '+(ix+1)+' of '+list.length:'')+'</div><span style="width:44px"></span></div>';
  h+='<section class="card stage">';
  if(ak){
    h+='<svg viewBox="0 0 300 220" role="img" aria-label="Figure demonstrating '+esc(r.exercise)+'. Tap to pause." data-act="playpause"><line x1="6" x2="294" y1="'+(170+ANIM[ak].dy)+'" y2="'+(170+ANIM[ak].dy)+'" stroke="var(--floor)" stroke-width="3" stroke-linecap="round"/><g id="fig" transform="translate(0,'+ANIM[ak].dy+')" fill="none" stroke-linecap="round" stroke-linejoin="round"></g></svg>'+
      '<div class="plabel" id="plabel"></div>'+
      (zones.length?'<div class="legend"><span><i class="lz work"></i>Should work</span>'+(hasStretch?'<span><i class="lz stretch"></i>Mild stretch is OK</span>':'')+'<span class="small">Faint figure = end position</span></div>':'');
  }else{
    h+='<div class="noanim"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#b9a99a" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><path d="M12 8v6M7 11l5-2 5 2M9 21l3-7 3 7"/></svg><div>No animation for this move yet. Use the notes below, or watch a video.</div><a href="https://www.youtube.com/results?search_query='+encodeURIComponent(r.exercise+' exercise form')+'" target="_blank" rel="noopener">Watch a video</a></div>';
  }
  h+='</section>';
  h+='<div style="padding:0 4px;display:flex;flex-direction:column;gap:4px"><h1 style="font-size:24px">'+esc(r.exercise)+'</h1><p style="margin:0;font-size:14px">'+esc(r.cue)+'</p></div>';
  if(fi){
    h+='<section class="card notes"><div><div class="lbl"><i class="lz work"></i>Where you should feel it</div><p>'+esc(fi.work)+'</p></div>'+
      (fi.stretch?'<div><div class="lbl"><i class="lz stretch"></i>Also normal</div><p>'+esc(fi.stretch)+'</p></div>':'')+
      '<div><div class="lbl">If you feel it somewhere else</div><p>'+esc(fi.fix)+'</p></div></section>';
  }
  h+='<section class="card vit'+(e?' done':'')+'" style="flex-wrap:wrap;cursor:default"><span class="nm">Target '+n+' × '+(lr[0]===lr[1]?lr[0]:lr[0]+'–'+lr[1])+ps+(+r.load>0?' @ '+fmtLb(+r.load)+' lb':'')+'<small>'+(lf?'Last time '+esc(lastStr(lf.move))+' · '+wd(lf.log.date):'First time on this move')+'</small></span>'+
    '<button class="tickb" data-act="tick" data-id="'+r.id+'" role="switch" aria-checked="'+!!e+'" aria-label="'+esc(r.exercise)+' done">'+RC+'</button>'+
    '<div class="sedit" style="width:100%;padding:8px 0 0">'+stepper('xsets',r.id,cs,'sets','sets')+stepper('xreps',r.id,cr,'reps','reps')+loadCtl('xload',r.id,cl)+'</div></section>';
  h+='<div class="actions"><button data-act="back" style="flex:1;background:var(--soft)">Back</button>'+
    (nx?'<button data-act="gonext" data-id="'+nx.id+'" style="flex:2;background:var(--green);color:#fff">Next: '+esc(nx.exercise)+'</button>':'<button data-act="back" style="flex:2;background:var(--green);color:#fff">Done</button>')+'</div>';
  app.innerHTML=h;
  setupFig(ak,zones);
}
var FAR=[['hip','kf'],['kf','af'],['sh','ef'],['ef','hf']],NEAR=[['hip','kn'],['kn','an'],['sh','en'],['en','hn']];
function setupFig(ak,zones){
  A.key=ak;A.els=null;if(!ak)return;
  var an=ANIM[ak],g=document.getElementById('fig'),NS='http://www.w3.org/2000/svg';
  function mk(tag,at,parent){var e=document.createElementNS(NS,tag);for(var k in at)e.setAttribute(k,at[k]);(parent||g).appendChild(e);return e;}
  function ln(el,a,b){el.setAttribute('x1',a[0]);el.setAttribute('y1',a[1]);el.setAttribute('x2',b[0]);el.setAttribute('y2',b[1]);}
  /* ghost of the end position, so the range of motion is visible */
  var gp=P(an.keys[1][0]),gg=mk('g',{opacity:.16,stroke:'var(--fig)'});
  FAR.concat(NEAR).forEach(function(s){ln(mk('line',{'stroke-width':8},gg),gp[s[0]],gp[s[1]]);});
  ln(mk('line',{'stroke-width':14},gg),gp.hip,gp.sh);mk('circle',{cx:gp.head[0],cy:gp.head[1],r:9,fill:'var(--fig)',stroke:'none'},gg);
  var E={};
  if(an.band)E.band=mk('line',{stroke:'#6b4f3f','stroke-width':2.5,'stroke-dasharray':'5 4'});
  E.far=FAR.map(function(s){return [s,mk('line',{stroke:'var(--far)','stroke-width':8})];});
  if(an.feet){E.ff=mk('line',{stroke:'var(--far)','stroke-width':7});}
  E.torso=mk('line',{stroke:'var(--fig)','stroke-width':15});
  E.near=NEAR.map(function(s){return [s,mk('line',{stroke:'var(--fig)','stroke-width':9})];});
  if(an.feet){E.nf=mk('line',{stroke:'var(--fig)','stroke-width':8});}
  E.joints=['kn','en'].map(function(j){return [j,mk('circle',{r:3.2,fill:'#faf5ef',stroke:'none'})];});
  E.head=mk('circle',{r:10,fill:'var(--fig)'});
  /* target zones drawn on top so they read like a highlighter */
  E.zones=(zones||[]).map(function(z){
    var work=z[3]==='work';
    return [z,mk('circle',work?{r:z[4],fill:'rgba(142,68,173,.32)',stroke:'#8e44ad','stroke-width':2}:{r:z[4],fill:'rgba(63,127,191,.10)',stroke:'#3f7fbf','stroke-width':2.2,'stroke-dasharray':'4 3'})];});
  A.els=E;drawAt(A.t);
}
function ease(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;}
function drawAt(tm){
  var an=ANIM[A.key],E=A.els;if(!an||!E)return;
  var keys=an.keys,total=0,sch=[];
  for(var i=0;i<keys.length;i++){var k=keys[(i+1)%keys.length];sch.push({a:P(keys[i][0]),b:P(k[0]),t0:total,mv:k[2],label:k[1]});total+=k[2]+k[3];}
  tm=((tm%total)+total)%total;var s=sch[0];
  for(i=0;i<sch.length;i++){var end=i+1<sch.length?sch[i+1].t0:total;if(tm>=sch[i].t0&&tm<end){s=sch[i];break;}}
  var u=tm-s.t0,f=u<s.mv?ease(u/s.mv):1,p={};
  for(var j in s.a)p[j]=[s.a[j][0]+(s.b[j][0]-s.a[j][0])*f,s.a[j][1]+(s.b[j][1]-s.a[j][1])*f];
  function ln(el,a,b){el.setAttribute('x1',a[0]);el.setAttribute('y1',a[1]);el.setAttribute('x2',b[0]);el.setAttribute('y2',b[1]);}
  E.far.forEach(function(x){ln(x[1],p[x[0][0]],p[x[0][1]]);});
  E.near.forEach(function(x){ln(x[1],p[x[0][0]],p[x[0][1]]);});
  ln(E.torso,p.hip,p.sh);E.head.setAttribute('cx',p.head[0]);E.head.setAttribute('cy',p.head[1]);
  E.joints.forEach(function(x){x[1].setAttribute('cx',p[x[0]][0]);x[1].setAttribute('cy',p[x[0]][1]);});
  function foot(el,a){if(!el)return;if(a[1]<156){el.setAttribute('visibility','hidden');return;}el.removeAttribute('visibility');ln(el,a,[a[0]+an.feet*14,170]);}
  foot(E.nf,p.an);foot(E.ff,p.af);
  /* zones pulse while the move is happening */
  var moving=u<s.mv,pulse=moving?1+.12*Math.sin(tm/120):1;
  E.zones.forEach(function(x){var z=x[0],a=p[z[0]],b=p[z[1]];
    var off=z[5]||[0,0];x[1].setAttribute('cx',a[0]+(b[0]-a[0])*z[2]+off[0]);x[1].setAttribute('cy',a[1]+(b[1]-a[1])*z[2]+off[1]);x[1].setAttribute('r',(z[4]*(z[3]==='work'?pulse:1)).toFixed(1));});
  if(E.band)ln(E.band,p.hn,p.an);
  var pl=document.getElementById('plabel');if(pl)pl.textContent=s.label+(A.playing?'':'  (paused, tap to play)');
}
function frame(now){
  requestAnimationFrame(frame);
  var dt=now-A.last;A.last=now;if(dt>100)dt=16;
  if(!A.els||!A.playing||!document.getElementById('fig'))return;
  A.t+=dt;drawAt(A.t);
}

/* program */
function renderProgram(){
  var h='<div class="top"><h1>Program</h1><button class="link" data-act="home">Done</button></div>';
  if(UI.banner)h+='<div class="banner" style="background:'+UI.banner[1]+'">'+esc(UI.banner[0])+'</div>';
  if(UI.copyBox!=null)h+='<section class="card"><div class="small" style="margin-bottom:6px">Copying was blocked here. Select all of this and copy it yourself:</div><textarea class="paste" readonly id="copybox">'+esc(UI.copyBox)+'</textarea><button class="link" data-act="closecopy">Close</button></section>';
  ['A','B'].concat(uniqSessions()).forEach(function(L,ix,arr){
    if(arr.indexOf(L)!==ix)return;
    var rows=S.program.filter(function(r){return r.session===L;});
    h+='<section class="card" style="padding:10px 16px"><div class="prw"><span class="lbl">Session '+esc(L)+'</span><button class="link" data-act="addrow" data-s="'+esc(L)+'">Add a move</button></div>';
    if(!rows.length)h+='<div class="small" style="padding:6px 0">No moves.</div>';
    rows.forEach(function(r){
      if(UI.edit===r.id){h+=editForm(r);return;}
      h+='<button class="prow'+(r.active?'':' off')+'" data-act="edit" data-id="'+r.id+'"><span class="tag">'+esc(r.slot||'—')+'</span><span style="flex:1;min-width:0"><b>'+esc(r.exercise)+'</b> <span class="meta">'+esc(r.sets)+' × '+esc(repStr(r.reps))+(+r.load>0?' @ '+fmtLb(+r.load)+' lb':'')+(r.active?'':' · not active')+'</span>'+(r.next?'<span class="meta" style="display:block">Next rung: '+esc(r.next)+'</span>':'')+'</span></button>';
    });
    h+='</section>';
  });
  h+='<p class="small" style="padding:0 4px;margin:0">Greyed rows are rungs you haven’t reached. Moving up switches which row is active; history stays with the exercise name. Order here is the order in the session.</p>';
  h+='<section class="card" style="display:flex;flex-direction:column;gap:8px"><div class="lbl">Health_tracking sheet</div>'+
    '<div class="small">Same columns as the Program tab: session, slot, exercise, sets, reps, next rung, cue, active, load lb.</div>'+
    '<div class="btns"><button class="ghost" data-act="copyprog">Copy program for the sheet</button><button class="ghost" data-act="showpaste">Paste from the sheet</button></div>';
  if(UI.paste)h+='<textarea class="paste" id="pastebox" placeholder="Select the rows in the Program tab (header optional), copy, and paste here."></textarea><div class="btns"><button class="pill" style="min-height:40px;font-size:14px" data-act="dopaste">Replace program</button><button class="ghost" data-act="hidepaste">Cancel</button></div>';
  h+='<div class="btns"><button class="ghost" data-act="copylog"'+(S.logs.length?'':' disabled')+'>Copy session log ('+S.logs.length+')</button></div>'+
    '<button class="link danger" data-act="reset" style="align-self:flex-start">'+(UI.confirm==='reset'?'Tap again to reset the program':'Reset program to the default')+'</button></section>';
  h+='<p class="small" style="padding:0 4px;margin:0">'+'Saved on this phone and synced to the Program tab of your sheet. Edit it there or here.'+'</p>';
  app.innerHTML=h;
  var cb=document.getElementById('copybox');if(cb){cb.focus();cb.select();}
}
function uniqSessions(){var o=[];S.program.forEach(function(r){if(o.indexOf(r.session)<0)o.push(r.session);});return o;}
function editForm(r){
  return '<div class="form" data-form="'+r.id+'">'+
    '<label>Exercise<input name="exercise" value="'+esc(r.exercise)+'"></label>'+
    '<div class="two"><label>Slot<input name="slot" value="'+esc(r.slot)+'"></label><label>Sets<input name="sets" inputmode="numeric" value="'+esc(r.sets)+'"></label><label>Reps<input name="reps" value="'+esc(r.reps)+'"></label></div>'+'<label>Starting load (lb, blank for bodyweight)<input name="load" inputmode="decimal" value="'+(+r.load>0?esc(r.load):'')+'"></label>'+
    '<label>Next rung<input name="next" value="'+esc(r.next)+'"></label>'+
    '<label>Cue<textarea name="cue" rows="3">'+esc(r.cue)+'</textarea></label>'+
    '<label class="chk"><input type="checkbox" name="active"'+(r.active?' checked':'')+'>Active (this is the rung you do now)</label>'+
    '<div class="btns"><button class="pill" style="min-height:40px;font-size:14px" data-act="saverow" data-id="'+r.id+'">Save</button><button class="ghost" data-act="canceledit">Cancel</button>'+
    '<button class="ghost" data-act="uprow" data-id="'+r.id+'" aria-label="Move earlier">↑</button><button class="ghost" data-act="downrow" data-id="'+r.id+'" aria-label="Move later">↓</button>'+
    '<button class="link danger" data-act="delrow" data-id="'+r.id+'">'+(UI.confirm==='row'+r.id?'Tap again to delete':'Delete')+'</button></div></div>';
}
function rowById(id){return S.program.filter(function(r){return r.id===id;})[0];}
function moveRow(id,dir){
  var r=rowById(id),i=S.program.indexOf(r),j=i+dir;
  while(j>=0&&j<S.program.length&&S.program[j].session!==r.session)j+=dir;
  if(j<0||j>=S.program.length)return;
  S.program[i]=S.program[j];S.program[j]=r;saveProgram();render();
}

/* ---------- events ---------- */
app.addEventListener('click',function(e){
  var b=e.target.closest('[data-act]');if(!b)return;
  var act=b.dataset.act,row=b.dataset.id?rowById(b.dataset.id):null;
  switch(act){
    case 'tick':toggleMove(row);break;
    case 'xsets':adjust(row,'s',+b.dataset.d);break;
    case 'xreps':adjust(row,'r',+b.dataset.d);break;
    case 'xload':adjust(row,'l',+b.dataset.d);break;
    case 'open':UI.sheet=row.id;UI.focusSheet=true;resetAnim();render();break;
    case 'close':var was=UI.sheet;UI.sheet=null;render();var btn=app.querySelector('[data-act=open][data-id="'+was+'"]');if(btn)btn.focus();break;
    case 'logclose':logAll(row);UI.sheet=null;render();break;
    case 'setck':setCheck(row,+b.dataset.i);break;
    case 'plan':UI.planOpen=true;UI.focusSheet=true;render();break;
    case 'closeplan':UI.planOpen=false;render();break;
    case 'ptab':UI.ptab=b.dataset.v;render();break;
    case 'hday':if(typeof flush==='function')flush();current=b.dataset.k;UI.banner=null;renderDay();break;
    case 'cdone':var ck=selDay();if(cardioOf(ck)){setKey(ck,'cardio',null);setKey(ck,'cardio_min',null);setKey(ck,'cardio_intensity',null);}else{var dr=cardioDraft(ck);setKey(ck,'cardio',1);setKey(ck,'cardio_min',dr.min);setKey(ck,'cardio_intensity',dr.int);}saveDay(ck);render();break;
    case 'cmin':var mk=selDay(),md2=cardioDraft(mk);md2.min=Math.max(5,Math.min(240,md2.min+5*(+b.dataset.d)));if(cardioOf(mk)){setKey(mk,'cardio_min',md2.min);saveDay(mk);}render();break;
    case 'cint':var ik=selDay(),id2=cardioDraft(ik);id2.int=b.dataset.v;if(cardioOf(ik)){setKey(ik,'cardio_intensity',id2.int);saveDay(ik);}render();break;
    case 'play':UI.screen='move';UI.row=row.id;UI.banner=null;resetAnim();render();window.scrollTo(0,0);break;
    case 'gonext':UI.row=row.id;resetAnim();render();window.scrollTo(0,0);break;
    case 'back':UI.screen='tab';UI.exp=UI.row;resetAnim();render();break;
    case 'swap':var sk=selDay(),cur=letterFor(sk);S.pref={letter:cur==='A'?'B':'A',date:sk};saveMeta();render();break;
    case 'feel':var L=dayLog(selDay());if(L){L.feel=L.feel===b.dataset.v?null:b.dataset.v;storeLog(L);
      UI.banner=L.feel==='too'?['Noted as too much. No move-up suggestions for 7 days; repeat these reps next time.','var(--lamber)']:null;render();}break;
    case 'up':moveUp(suggestions()[0]);break;
    case 'notyet':var s=suggestions()[0];S.declined[s.row.id]=s.log.id;saveMeta();render();break;
    case 'pdone':var pk=selDay();setKey(pk,'mobility',mobDone(pk)?null:1);saveDay(pk);render();break;
    case 'expand':UI.open[b.dataset.p]=!UI.open[b.dataset.p];render();break;
    case 'vis':visToggle(selDay(),b.dataset.p,b.dataset.k);render();break;
    case 'dellog':var id=b.dataset.id;twoTap('del'+id,function(){S.logs=S.logs.filter(function(x){return x.id!==id;});drop('s_'+id);render();});break;
    case 'program':UI.screen='program';UI.banner=null;render();window.scrollTo(0,0);break;
    case 'home':UI.screen='tab';UI.banner=null;UI.edit=null;UI.paste=false;UI.copyBox=null;render();window.scrollTo(0,0);break;
    /* guided view */
    case 'playpause':A.playing=!A.playing;drawAt(A.t);break;
    /* program */
    case 'edit':UI.edit=b.dataset.id;render();break;
    case 'canceledit':UI.edit=null;render();break;
    case 'addrow':var nr={id:uid(),session:b.dataset.s,slot:'',exercise:'New move',sets:3,reps:'8-12',next:'',cue:'',active:true};S.program.push(nr);UI.edit=nr.id;saveProgram();render();break;
    case 'saverow':var r=rowById(b.dataset.id),f=app.querySelector('[data-form="'+r.id+'"]');
      ['exercise','slot','reps','next','cue'].forEach(function(n){r[n]=f.querySelector('[name='+n+']').value.trim();});
      r.sets=Math.max(1,Math.min(8,parseInt(f.querySelector('[name=sets]').value,10)||3));
      var nl=parseFloat(f.querySelector('[name=load]').value)||0;if(nl!==(+r.load||0)){r.load=nl;r.loadSince=Date.now();}
      r.active=f.querySelector('[name=active]').checked;if(!r.exercise)r.exercise='Untitled move';
      UI.edit=null;saveProgram();render();break;
    case 'uprow':moveRow(b.dataset.id,-1);break;
    case 'downrow':moveRow(b.dataset.id,1);break;
    case 'delrow':var rid=b.dataset.id;twoTap('row'+rid,function(){S.program=S.program.filter(function(x){return x.id!==rid;});UI.edit=null;saveProgram();render();});break;
    case 'copyprog':copyText(programTSV(),'Copied. In the Program tab, click A1 and paste.');break;
    case 'copylog':copyText(logTSV(),'Copied '+S.logs.length+' sessions as rows, one per set.');break;
    case 'closecopy':UI.copyBox=null;render();break;
    case 'showpaste':UI.paste=true;render();var pb=document.getElementById('pastebox');if(pb)pb.focus();break;
    case 'hidepaste':UI.paste=false;render();break;
    case 'dopaste':var rows=parsePaste(document.getElementById('pastebox').value);
      if(!rows.length){UI.banner=['No rows found. Copy the cells straight from the sheet so the columns stay tab-separated.','var(--lamber)'];render();break;}
      S.program=rows;saveProgram();UI.paste=false;UI.banner=['Program replaced with '+rows.length+' rows.','var(--lgreen)'];render();break;
    case 'reset':twoTap('reset',function(){S.program=toRows(DEFAULT_PROGRAM);saveProgram();UI.banner=['Program reset to the default.','var(--lgreen)'];render();});break;
  }
});
app.addEventListener('change',function(e){var t=e.target;if(!t.classList||!t.classList.contains('lin'))return;
  var v=parseFloat(String(t.value).replace(',','.'));if(!(v>=0))v=0;v=Math.min(999,v);
  adjust(rowById(t.dataset.id),'l',0,v);
});
app.addEventListener('keydown',function(e){if(e.key==='Escape'&&(UI.sheet||UI.planOpen)){UI.sheet=null;UI.planOpen=false;render();return;}var c=e.target.closest&&e.target.closest('section.vit[data-act]');if(c&&(e.key===' '||e.key==='Enter')){e.preventDefault();c.click();}});
app.addEventListener('toggle',function(e){var el=e.target;if(el.dataset&&el.dataset.log)UI.openLog=el.open?el.dataset.log:(UI.openLog===el.dataset.log?null:UI.openLog);},true);


/* ---------- hook into the app ---------- */
function show(){if(!app)return;render();}
var hostRenderDay=renderDay;
renderDay=function(){hostRenderDay.apply(this,arguments);if(currentTab==='physio')show();};
var hostReload=window.reloadEntries;
window.reloadEntries=function(goToday){hostReload(goToday);loadProgram();if(currentTab==='physio')show();};
/* the phone's back button or swipe: close the open panel or screen first */
window.onBack=function(){
  if(currentTab!=='physio')return false;
  if(UI.sheet){UI.sheet=null;render();return true;}
  if(UI.planOpen){UI.planOpen=false;render();return true;}
  if(UI.screen==='program'){UI.screen='tab';UI.edit=null;UI.paste=false;UI.copyBox=null;render();window.scrollTo(0,0);return true;}
  return false;
};
window.Physio={show:show,reloadProgram:function(){loadProgram();if(currentTab==='physio')show();}};
loadMeta();loadProgram();
app=document.getElementById('physioApp');
if(currentTab==='physio')show();
requestAnimationFrame(function(n){A.last=n;frame(n);});
})();
