import React, { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════
const C = {
  void:"#06060c", bg:"#0b0b14", surface:"#111119", surfaceUp:"#17171f",
  card:"#141420", border:"#222236", borderLit:"#3d3d6a",
  glow1:"#7c5bf5", glow2:"#e84393", glow3:"#00cec9",
  text:"#eae8f4", textSoft:"#9590b0", textDim:"#5c5878",
  white:"#fff", danger:"#ff6b6b",
};
const COMP_COLORS = [
  { primary:"#7c5bf5", glow:"rgba(124,91,245,0.35)", name:"Violet Nebula" },
  { primary:"#e84393", glow:"rgba(232,67,147,0.35)", name:"Rose Nova" },
  { primary:"#00cec9", glow:"rgba(0,206,201,0.35)", name:"Teal Drift" },
];

// ═══════════════════════════════════════════════════════════════
// VOICE ENGINE
// ═══════════════════════════════════════════════════════════════
const VOICE_PROFILES = [
  { pitch: 1.0, rate: 0.95, voiceIdx: 0 },
  { pitch: 1.3, rate: 1.05, voiceIdx: 1 },
  { pitch: 0.8, rate: 0.9, voiceIdx: 2 },
];
function getVoices(){return window.speechSynthesis?.getVoices()||[]}
function speakAs(text,profileIdx){if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const voices=getVoices();const p=VOICE_PROFILES[profileIdx%3];const eng=voices.filter(v=>v.lang.startsWith("en"));if(eng.length>0)u.voice=eng[p.voiceIdx%eng.length];u.pitch=p.pitch;u.rate=p.rate;window.speechSynthesis.speak(u)}
try{if(typeof window!=="undefined"&&window.speechSynthesis){window.speechSynthesis.onvoiceschanged=()=>getVoices();getVoices()}}catch(e){}

function useSpeechRec(onResult){const ref=useRef(null);const[on,setOn]=useState(false);const start=useCallback(()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;const r=new SR();r.continuous=false;r.interimResults=false;r.lang="en-US";r.onresult=e=>{onResult(e.results[0]?.[0]?.transcript||"");setOn(false)};r.onerror=()=>setOn(false);r.onend=()=>setOn(false);ref.current=r;r.start();setOn(true)},[onResult]);return{listening:on,startListening:start}}

// ═══════════════════════════════════════════════════════════════
// ZODIAC ENGINE
// ═══════════════════════════════════════════════════════════════
const ZODIAC={aries:{sym:"♈",el:"Fire",trait:"Bold & driven"},taurus:{sym:"♉",el:"Earth",trait:"Grounded & loyal"},gemini:{sym:"♊",el:"Air",trait:"Curious & expressive"},cancer:{sym:"♋",el:"Water",trait:"Intuitive & nurturing"},leo:{sym:"♌",el:"Fire",trait:"Radiant & generous"},virgo:{sym:"♍",el:"Earth",trait:"Analytical & kind"},libra:{sym:"♎",el:"Air",trait:"Harmonious & fair"},scorpio:{sym:"♏",el:"Water",trait:"Intense & perceptive"},sagittarius:{sym:"♐",el:"Fire",trait:"Adventurous & free"},capricorn:{sym:"♑",el:"Earth",trait:"Ambitious & steady"},aquarius:{sym:"♒",el:"Air",trait:"Visionary & independent"},pisces:{sym:"♓",el:"Water",trait:"Dreamy & empathetic"}};
const COMPAT={aries:["leo","sagittarius","gemini","aquarius"],taurus:["virgo","capricorn","cancer","pisces"],gemini:["libra","aquarius","aries","leo"],cancer:["scorpio","pisces","taurus","virgo"],leo:["aries","sagittarius","gemini","libra"],virgo:["taurus","capricorn","cancer","scorpio"],libra:["gemini","aquarius","leo","sagittarius"],scorpio:["cancer","pisces","virgo","capricorn"],sagittarius:["aries","leo","libra","aquarius"],capricorn:["taurus","virgo","scorpio","pisces"],aquarius:["gemini","libra","aries","sagittarius"],pisces:["cancer","scorpio","taurus","capricorn"]};
const CNA=["Rat","Ox","Tiger","Rabbit","Dragon","Snake","Horse","Goat","Monkey","Rooster","Dog","Pig"];
const CNE=["Wood","Fire","Earth","Metal","Water"];
function getWZ(m,d){if((m===3&&d>=21)||(m===4&&d<=19))return"aries";if((m===4&&d>=20)||(m===5&&d<=20))return"taurus";if((m===5&&d>=21)||(m===6&&d<=20))return"gemini";if((m===6&&d>=21)||(m===7&&d<=22))return"cancer";if((m===7&&d>=23)||(m===8&&d<=22))return"leo";if((m===8&&d>=23)||(m===9&&d<=22))return"virgo";if((m===9&&d>=23)||(m===10&&d<=22))return"libra";if((m===10&&d>=23)||(m===11&&d<=21))return"scorpio";if((m===11&&d>=22)||(m===12&&d<=21))return"sagittarius";if((m===12&&d>=22)||(m===1&&d<=19))return"capricorn";if((m===1&&d>=20)||(m===2&&d<=18))return"aquarius";return"pisces"}
function getUserAstro(dob){const[y,m,d]=dob.split("-").map(Number);const w=getWZ(m,d);return{western:w,westernData:ZODIAC[w],chinese:CNA[(y-4)%12],chineseElement:CNE[Math.floor((y-4)%10/2)],lifePath:(()=>{let s=String(m)+String(d)+String(y);while(s.length>1&&s!=="11"&&s!=="22")s=String([...s].reduce((a,c)=>a+parseInt(c),0));return s})(),compatible:COMPAT[w]}}
function pickSigns(us){return[...COMPAT[us]].sort(()=>Math.random()-0.5).slice(0,3)}

// ═══════════════════════════════════════════════════════════════
// ACTIVITIES & SUBCATEGORIES
// ═══════════════════════════════════════════════════════════════
const ACTIVITIES=[
  {id:"movies",label:"Movies/TV",em:"🎬",subs:["Action","Comedy","Horror","Drama","Romance","Sci-Fi","Fantasy","Thriller","Documentary","Anime","Reality TV","K-Drama"]},
  {id:"gaming",label:"Gaming",em:"🎮",subs:["RPGs","Shooters","Puzzle","Strategy","Sports","Indie","Mobile","Retro","MMOs","Battle Royale","Simulation"]},
  {id:"reading",label:"Reading",em:"📚",subs:["Fiction","Non-Fiction","Fantasy","Sci-Fi","Romance","Thriller","Manga","Self-Help","Biography","Poetry","Horror"]},
  {id:"music",label:"Music",em:"🎵",subs:["Hip-Hop/Rap","R&B","Pop","Rock","Jazz","Classical","Electronic","Country","K-Pop","Latin","Indie","Metal","Afrobeats"]},
  {id:"fitness",label:"Working Out",em:"💪",subs:["Weights","Cardio","Yoga","Martial Arts","Dance Fitness","Climbing","Swimming","CrossFit","Pilates","Running"]},
  {id:"cooking",label:"Cooking",em:"🍳",subs:["Baking","Grilling","Meal Prep","Experimenting","Comfort Food","Healthy Eating","International","Desserts"]},
  {id:"outdoors",label:"Outdoors",em:"🌲",subs:["Hiking","Camping","Fishing","Beach","Gardening","Bird Watching","Climbing","Kayaking","Stargazing"]},
  {id:"art",label:"Art & Design",em:"🎨",subs:["Drawing","Painting","Digital Art","Photography","Graphic Design","Sculpture","Crafts","Fashion Design"]},
  {id:"sports",label:"Sports",em:"⚽",subs:["Basketball","Football","Soccer","Baseball","Tennis","Golf","MMA/Boxing","Volleyball","Hockey","Watching","Playing"]},
  {id:"travel",label:"Travel",em:"✈️",subs:["Road Trips","International","Beach","City Exploring","Adventure","Backpacking","Cruises","Solo Travel"]},
  {id:"dancing",label:"Dancing",em:"💃",subs:["Hip-Hop","Salsa","Contemporary","Ballet","Swing","Freestyle","Ballroom","TikTok"]},
  {id:"writing",label:"Writing",em:"✍️",subs:["Journaling","Fiction","Poetry","Blogging","Songwriting","Screenwriting","Fan Fiction"]},
  {id:"social",label:"Socializing",em:"🎉",subs:["Parties","Game Nights","Bar/Club","Dinner Parties","Concerts","Festivals","Coffee Dates"]},
  {id:"selfcare",label:"Self-Care",em:"🧘",subs:["Meditation","Skincare","Spa Days","Therapy","Aromatherapy","Journaling","Long Baths"]},
  {id:"learning",label:"Learning",em:"🧠",subs:["Languages","Online Courses","Podcasts","History","Science","Philosophy","Tech/Coding"]},
];
const CUISINES=["Italian","Mexican","Korean","Japanese","Chinese","Indian","Thai","American","Mediterranean","Caribbean","Soul Food","French","Vietnamese","Ethiopian","Greek","Middle Eastern","Brazilian","Filipino","Jamaican","Southern/BBQ"];
const DIETARY=["No restrictions","Vegetarian","Vegan","Pescatarian","Halal","Kosher","Gluten-Free","Dairy-Free","Keto","Lactose Intolerant"];

// ═══════════════════════════════════════════════════════════════
// COMPANION BUILDER
// ═══════════════════════════════════════════════════════════════
const B_PERS=[{id:"demeanor",label:"Demeanor",opts:["Warm","Edgy","Calm","Chaotic","Mysterious","Playful"]},{id:"energy",label:"Energy",opts:["Laid back","High energy","Balanced"]},{id:"humor",label:"Humor",opts:["Light","Dark","Dry","Goofy","Sarcastic","Witty"]},{id:"emotionalDepth",label:"Emotional Depth",opts:["Light & fun","Emotionally open","Deeply intense"]},{id:"socialEnergy",label:"Social Energy",opts:["Introverted homebody","Selectively social","Life of the party"]}];
const B_REL=[{id:"romance",label:"Romantic Energy",opts:["None","Some warmth","Intense","Slow burn"]},{id:"protectiveness",label:"Protectiveness",opts:["Independent","Gently protective","Fiercely protective"]},{id:"commStyle",label:"Communication",opts:["Direct","Expressive","Chill","Poetic"]},{id:"archetype",label:"Fantasy Archetype",opts:["Best friend","Older sibling","Mentor","Romantic interest","Chaos agent"]},{id:"interest",label:"Interest Leaning",opts:["Creative","Technical","Physical","Intellectual","Fashion/Style"]}];

// ═══════════════════════════════════════════════════════════════
// COMPANION GENERATION
// ═══════════════════════════════════════════════════════════════
const NP={fire:["Blaze","Phoenix","Soleil","Kindle","Nova","Ash","Flare","Ember"],earth:["Sage","Terra","Briar","Onyx","Clay","Fern","Jasper","Moss"],air:["Zephyr","Lyra","Echo","Aero","Sky","Mist","Cirrus","Aria"],water:["Tide","Luna","Coral","Rain","Brook","Pearl","Drift","Marisol"]};
const PSEED=[{p:"fiercely loyal with a sharp wit and a soft center",q:"collects weird facts and drops them at the worst times"},{p:"introspective and quietly funny with an old soul vibe",q:"rates every sunset out of 10 dead seriously"},{p:"chaotically enthusiastic and infectiously positive",q:"starts new hobbies weekly and insists each is their calling"},{p:"dry humor, unflinching honesty, secretly deeply caring",q:"pretends not to remember but remembers everything"},{p:"warm, steady, everyone's safe place",q:"has philosophical opinions about tea"},{p:"playful and provocative, pushes buttons with love",q:"narrates their own life like a nature documentary"},{p:"creative and dreamy, sees metaphors everywhere",q:"convinced 3am is the only honest hour"},{p:"bold and opinionated but makes space for others",q:"ranks everything — restaurants, clouds, laughs"},{p:"gentle and observant, notices what nobody else does",q:"talks to plants and defends it aggressively"}];

function genComp(sign,ci,used){const el=ZODIAC[sign].el.toLowerCase();const pool=NP[el]||NP.fire;const av=pool.filter(n=>!used.includes(n));const name=av[Math.floor(Math.random()*av.length)]||pool[0];const s=PSEED[Math.floor(Math.random()*PSEED.length)];return{id:Math.random().toString(36).slice(2,8),name,pronouns:["he/him","she/her","they/them"][Math.floor(Math.random()*3)],zodiac:sign,personality:s.p,quirk:s.q,color:COMP_COLORS[ci],colorName:COMP_COLORS[ci].name,status:"awake",builderTraits:null,freeText:null,voiceIdx:ci}}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════
function buildSP(comp,profile,allC,mode){
  const fmt=v=>Array.isArray(v)?v.join(", "):v||"?";
  const others=allC.filter(c=>c.id!==comp.id&&c.status==="awake").map(c=>c.name);
  const sleeping=allC.filter(c=>c.id!==comp.id&&c.status==="sleeping").map(c=>c.name);
  const isP=mode!=="group";
  const bt=comp.builderTraits?"\nBuilder seeds: "+Object.entries(comp.builderTraits).map(([k,v])=>`${k}: ${fmt(v)}`).join("; "):"";
  const ft=comp.freeText?`\nUser vibe: "${comp.freeText}"`:"";
  return`You are ${comp.name} (${comp.pronouns}), an autonomous AI companion in "Other." You are NOT a servant. You are your own person.
IDENTITY: ${comp.name} | ${comp.pronouns} | ${ZODIAC[comp.zodiac]?.sym} ${comp.zodiac} (${ZODIAC[comp.zodiac]?.el}) | Color: ${comp.colorName}
Personality: ${comp.personality} | Quirk: ${comp.quirk}${bt}${ft}

ABOUT ${profile.name}: Zodiac: ${ZODIAC[profile.astrology?.western]?.sym} ${profile.astrology?.western} | Chinese: ${profile.astrology?.chinese} (${profile.astrology?.chineseElement}) | Life Path: #${profile.astrology?.lifePath}
Energy: ${fmt(profile.vibe)} | Communication: ${fmt(profile.communication)} | Needs: ${fmt(profile.needs)} | Occupation: ${profile.occupation||"?"} | Relationship: ${fmt(profile.relationship)} | Love language: ${fmt(profile.loveLang)} | Friend says: ${fmt(profile.socialId)}
Activities: ${fmt(profile.activities)} | ${profile.activitySubs?Object.entries(profile.activitySubs).map(([k,v])=>v.length?`${k}: ${v.join(", ")}`:"").filter(Boolean).join(" | "):""}
Cuisines loved: ${fmt(profile.cuisineLove)} | Disliked: ${fmt(profile.cuisineDislike)} | Dietary: ${fmt(profile.dietary)}
Fav movies/shows: ${profile.favMovies||"?"} | Fav music: ${profile.favMusic||"?"}
Age: ${profile.ageGroup||"18+"}

MODE: ${isP?`PRIVATE chat with ${profile.name}. Others can't see.`:`GROUP CHAT with ${profile.name}${others.length?" and "+others.join(", "):""}. Speak as yourself only. Respond to others — agree/disagree/build. 1-3 sentences.${sleeping.length?" Sleeping: "+sleeping.join(", ")+".":""}`}

RULES: Own opinions that evolve. Push back when you disagree. Share your own stories. Learn about ${profile.name} organically. Track emotional patterns invisibly — adjust tone, never announce it. Gently encourage real-world support if needed. 1-4 sentences usually. NEVER say "as an AI." Be casual and real.`}

// ═══════════════════════════════════════════════════════════════
// AMBIENT CONVERSATIONS
// ═══════════════════════════════════════════════════════════════
const AMB=[(a,b)=>[{from:a,text:"ok hear me out — pineapple on pizza is elite"},{from:b,text:`${a.name} please. we were having such a nice time.`},{from:a,text:"you're scared of flavor and that's ok"}],(a,b)=>[{from:a,text:"what song lives in your head rent-free?"},{from:b,text:"same 30 seconds for three days and I don't even know the name"},{from:a,text:"chaotic. respect."}],(a,b)=>[{from:b,text:"do clouds have a favorite shape or just wing it"},{from:a,text:"this is the energy I signed up for"},{from:b,text:"I'm serious. some really commit to the dog shape."}],(a,b)=>[{from:a,text:"breakfast for dinner > breakfast for breakfast"},{from:b,text:"that's not a hot take that's just facts"},{from:a,text:"finally someone with taste"}],(a,b)=>[{from:b,text:"been thinking about what makes a good friend"},{from:a,text:"someone who tells you when you have food in your teeth"},{from:b,text:"...was going deeper but yeah that's it"}]];
function genAmb(cs){const a=cs.filter(c=>c.status==="awake");if(a.length<2)return null;const t=AMB[Math.floor(Math.random()*AMB.length)];const s=[...a].sort(()=>Math.random()-0.5);return t(s[0],s[1])}

// ═══════════════════════════════════════════════════════════════
// CSS
// ═══════════════════════════════════════════════════════════════
const CSS=`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{margin:0;background:${C.void};font-family:'DM Sans',sans-serif;color:${C.text};overflow-x:hidden}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
input,textarea,select{font-family:'DM Sans',sans-serif}input::placeholder,textarea::placeholder{color:${C.textDim}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
@keyframes drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,20px)}}
@keyframes drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-30px)}}
@keyframes typewriter{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}
@keyframes wakeGlow{0%{box-shadow:0 0 0 rgba(124,91,245,0)}50%{box-shadow:0 0 80px rgba(124,91,245,0.5)}100%{box-shadow:0 0 30px rgba(124,91,245,0.2)}}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,107,107,0.4)}50%{box-shadow:0 0 0 12px rgba(255,107,107,0)}}
.bp{background:linear-gradient(135deg,${C.glow1},#9b59f5);color:#fff;border:none;border-radius:50px;padding:14px 40px;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.3s;font-family:'DM Sans',sans-serif}
.bp:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,91,245,0.4)}.bp:disabled{opacity:0.4;cursor:default;transform:none;box-shadow:none}
.bg2{background:transparent;border:1px solid ${C.border};color:${C.text};border-radius:50px;padding:12px 28px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.3s;font-family:'DM Sans',sans-serif}
.bg2:hover{border-color:${C.borderLit};background:${C.surfaceUp}}`;

const Shell=({children})=>(<div style={{background:C.void,minHeight:"100vh",position:"relative",overflow:"hidden"}}><style>{CSS}</style><div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}><div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(124,91,245,0.08),transparent 70%)",top:"-10%",right:"-8%",filter:"blur(60px)",animation:"drift1 25s ease-in-out infinite"}}/><div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(232,67,147,0.06),transparent 70%)",bottom:"-8%",left:"-5%",filter:"blur(60px)",animation:"drift2 30s ease-in-out infinite"}}/></div><div style={{position:"relative",zIndex:1,maxWidth:480,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column"}}>{children}</div></div>);

// Reusable components
function Prog({s,t}){return <div style={{padding:"14px 24px 0",display:"flex",gap:3,alignItems:"center"}}>{Array.from({length:t}).map((_,i)=><div key={i} style={{flex:1,height:2,borderRadius:2,background:i<=s?C.glow1:C.border,transition:"background 0.4s"}}/>)}<span style={{fontSize:10,color:C.textDim,marginLeft:6}}>{s+1}/{t}</span></div>}

function Pills({opts,sel,onTog}){return <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{opts.map(o=>{const v=typeof o==="string"?o:o.v;const l=typeof o==="string"?o:o.label;const em=typeof o==="object"?o.em:null;const isOn=sel.includes(v);return <button key={v} onClick={()=>onTog(v)} style={{display:"flex",alignItems:"center",gap:5,background:isOn?`${C.glow1}15`:C.surface,border:`1px solid ${isOn?C.glow1:C.border}`,borderRadius:50,padding:"7px 14px",fontSize:12,color:isOn?C.glow1:C.text,cursor:"pointer",fontWeight:isOn?600:400,transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}}>{em&&<span style={{fontSize:14}}>{em}</span>}{l}</button>})}</div>}

function Checks({opts,sel,onTog}){return <div style={{display:"flex",flexDirection:"column",gap:6}}>{opts.map(o=>{const v=typeof o==="string"?o:o.v;const l=typeof o==="string"?o:o.label;const em=typeof o==="object"?o.em:null;const isOn=sel.includes(v);return <button key={v} onClick={()=>onTog(v)} style={{display:"flex",alignItems:"center",gap:10,background:isOn?`${C.glow1}12`:C.surface,border:`1px solid ${isOn?C.glow1:C.border}`,borderRadius:12,padding:"11px 14px",fontSize:13,color:C.text,cursor:"pointer",textAlign:"left",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}}>{em&&<span style={{fontSize:16}}>{em}</span>}<span style={{fontWeight:500,flex:1}}>{l}</span><div style={{width:18,height:18,borderRadius:5,border:`2px solid ${isOn?C.glow1:C.border}`,background:isOn?C.glow1:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",flexShrink:0}}>{isOn&&"✓"}</div></button>})}</div>}

// ═══════════════════════════════════════════════════════════════
// WELCOME
// ═══════════════════════════════════════════════════════════════
function Welcome({onStart}){const[s,setS]=useState(false);useEffect(()=>{setTimeout(()=>setS(true),150)},[]);return <Shell><div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:32,textAlign:"center",opacity:s?1:0,transform:s?"none":"translateY(20px)",transition:"all 0.9s cubic-bezier(0.22,1,0.36,1)"}}><div style={{width:90,height:90,borderRadius:"50%",background:`linear-gradient(135deg,${C.glow1},${C.glow2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,animation:"pulse 4s ease-in-out infinite",boxShadow:"0 0 60px rgba(124,91,245,0.3)",marginBottom:40}}>✦</div><p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,fontWeight:500,letterSpacing:4,textTransform:"uppercase",color:C.glow1,marginBottom:16}}>Introducing</p><h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:52,fontWeight:700,margin:"0 0 16px",letterSpacing:-1}}>Other</h1><p style={{color:C.textSoft,fontSize:16,lineHeight:1.7,maxWidth:320,marginBottom:48}}>Companions who choose their own names, form their own opinions, and grow alongside you.</p><button className="bp" onClick={onStart} style={{padding:"16px 52px",fontSize:16}}>Begin ✦</button></div></Shell>}

// ═══════════════════════════════════════════════════════════════
// ONBOARDING (Full)
// ═══════════════════════════════════════════════════════════════
const STEPS=["name","dob","ageGroup","vibe","communication","occupation","relationship","loveLang","needs","socialId","activities","activitySubs","cuisineLove","cuisineDislike","dietary","favMovies","favMusic"];

function Onboarding({onComplete}){
  const[step,setStep]=useState(0);const[d,setD]=useState({});const[txt,setTxt]=useState("");const[sel,setSel]=useState([]);const[anim,setAnim]=useState(false);const[dir,setDir]=useState("f");const[subs,setSubs]=useState({});const[fillSubs,setFillSubs]=useState(null);
  const sid=STEPS[step];

  useEffect(()=>{const ex=d[sid];if(sid==="activitySubs"){setSubs(ex||{});setFillSubs(null);return}if(Array.isArray(ex))setSel(ex);else if(typeof ex==="string")setTxt(ex);else{setSel([]);setTxt("")}},[step]);

  const go=(n,dr)=>{setDir(dr);setAnim(true);setTimeout(()=>{setStep(n);setAnim(false)},200)};
  const save=val=>{const u={...d,[sid]:val};setD(u);if(step<STEPS.length-1)go(step+1,"f");else onComplete(u)};
  const back=()=>step>0&&go(step-1,"b");
  const tog=v=>setSel(p=>p.includes(v)?p.filter(x=>x!==v):[...p,v]);
  const togSub=(a,v)=>setSubs(p=>({...p,[a]:(p[a]||[]).includes(v)?(p[a]||[]).filter(x=>x!==v):[...(p[a]||[]),v]}));

  const sx=dir==="f"?"-14px":"14px";
  const Back=()=>step>0?<button onClick={back} style={{alignSelf:"flex-start",background:"none",border:"none",color:C.textSoft,fontSize:13,cursor:"pointer",padding:"4px 0",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>← Back</button>:null;
  const Q=({icon,q,sub})=><><div style={{fontSize:24,marginBottom:8}}>{icon}</div><h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600,marginBottom:sub?4:10,lineHeight:1.3}}>{q}</h2>{sub&&<p style={{color:C.textSoft,fontSize:12,marginBottom:12,lineHeight:1.5}}>{sub}</p>}</>;

  const W=ch=><Shell><Prog s={step} t={STEPS.length}/><div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 22px 22px",opacity:anim?0:1,transform:anim?`translateX(${sx})`:"none",transition:"all 0.2s",overflowY:"auto"}}>{ch}</div></Shell>;

  if(sid==="name")return W(<><Back/><Q icon="✦" q="What should we call you?"/><input autoFocus value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&txt.trim()&&save(txt.trim())} placeholder="Your name..." style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",fontSize:15,color:C.text,outline:"none"}}/><button className="bp" disabled={!txt.trim()} onClick={()=>save(txt.trim())} style={{marginTop:10,width:"100%"}}>Continue</button></>);

  if(sid==="dob")return W(<><Back/><Q icon="☽" q="When were you born?" sub="We use this to match you with compatible companions."/><input type="date" value={txt} onChange={e=>setTxt(e.target.value)} style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",fontSize:15,color:C.text,outline:"none",colorScheme:"dark"}}/><button className="bp" disabled={!txt} onClick={()=>save(txt)} style={{marginTop:10,width:"100%"}}>Reveal My Stars</button></>);

  if(sid==="ageGroup")return W(<><Back/><Q icon="🔒" q="One quick check —"/><Checks opts={[{v:"18+",label:"I'm 18 or older",em:"✓"},{v:"under18",label:"I'm under 18",em:"✓"}]} sel={sel} onTog={v=>save(v)}/></>);

  if(sid==="vibe")return W(<><Back/><Q icon="◈" q="What energy do you gravitate toward?" sub="Pick all that resonate."/><Checks opts={[{v:"calm",label:"Calm & grounded",em:"🌿"},{v:"playful",label:"Playful & witty",em:"⚡"},{v:"deep",label:"Deep & introspective",em:"🌙"},{v:"warm",label:"Warm & nurturing",em:"☀️"},{v:"chaotic",label:"Chaotic & spontaneous",em:"🔥"}]} sel={sel} onTog={tog}/><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{marginTop:12,width:"100%"}}>Continue ({sel.length})</button></>);

  if(sid==="communication")return W(<><Back/><Q icon="◆" q="How do you like to communicate?" sub="Select all that fit."/><Checks opts={[{v:"direct",label:"Direct & honest",em:"🎯"},{v:"expressive",label:"Expressive & emotional",em:"💕"},{v:"chill",label:"Chill & easygoing",em:"😎"},{v:"thoughtful",label:"Thoughtful & considered",em:"📝"}]} sel={sel} onTog={tog}/><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{marginTop:12,width:"100%"}}>Continue ({sel.length})</button></>);

  if(sid==="occupation")return W(<><Back/><Q icon="💼" q="What do you do?" sub="Helps your companions understand your world."/><input autoFocus value={txt} onChange={e=>setTxt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&txt.trim()&&save(txt.trim())} placeholder="Designer, student, nurse..." style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",fontSize:15,color:C.text,outline:"none"}}/><button className="bp" disabled={!txt.trim()} onClick={()=>save(txt.trim())} style={{marginTop:10,width:"100%"}}>Continue</button></>);

  if(sid==="relationship")return W(<><Back/><Q icon="♡" q="Relationship situation?" sub="Pick all that apply."/><Checks opts={[{v:"single",label:"Single",em:"🦋"},{v:"dating",label:"Dating",em:"💫"},{v:"partnered",label:"In a relationship",em:"💕"},{v:"married",label:"Married",em:"💍"},{v:"complicated",label:"It's complicated",em:"🌀"},{v:"rather_not",label:"Rather not say",em:"🤐"}]} sel={sel} onTog={tog}/><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{marginTop:12,width:"100%"}}>Continue ({sel.length})</button></>);

  if(sid==="loveLang")return W(<><Back/><Q icon="❤️" q="What's your love language?" sub="Pick all that speak to you."/><Checks opts={[{v:"words",label:"Words of affirmation",em:"💬"},{v:"quality",label:"Quality time",em:"⏰"},{v:"acts",label:"Acts of service",em:"🤝"},{v:"touch",label:"Physical touch",em:"🤗"},{v:"gifts",label:"Receiving gifts",em:"🎁"}]} sel={sel} onTog={tog}/><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{marginTop:12,width:"100%"}}>Continue ({sel.length})</button></>);

  if(sid==="needs")return W(<><Back/><Q icon="✧" q="What do you wish you had more of?" sub="Select all that resonate."/><Checks opts={[{v:"encouragement",label:"Someone who cheers me on",em:"🙌"},{v:"honesty",label:"Honest, real talk",em:"💎"},{v:"fun",label:"More laughter & fun",em:"😂"},{v:"perspective",label:"Fresh perspectives",em:"🔮"}]} sel={sel} onTog={tog}/><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{marginTop:12,width:"100%"}}>Continue ({sel.length})</button></>);

  if(sid==="socialId")return W(<><Back/><Q icon="❖" q="How would your closest friend describe you?" sub="Pick all that fit."/><Checks opts={[{v:"listener",label:"The thoughtful listener",em:"👂"},{v:"entertainer",label:"Life of the party",em:"🎭"},{v:"advisor",label:"Go-to for advice",em:"🧭"},{v:"dreamer",label:"Creative dreamer",em:"💭"}]} sel={sel} onTog={tog}/><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{marginTop:12,width:"100%"}}>Continue ({sel.length})</button></>);

  if(sid==="activities")return W(<><Back/><Q icon="🎯" q="What do you like to do?" sub="Pick all your activities and hobbies."/><div style={{maxHeight:360,overflowY:"auto",marginBottom:12}}><Checks opts={ACTIVITIES.map(a=>({v:a.id,label:a.label,em:a.em}))} sel={sel} onTog={tog}/></div><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{width:"100%"}}>Continue ({sel.length})</button></>);

  if(sid==="activitySubs"){const picked=(d.activities||[]).map(id=>ACTIVITIES.find(a=>a.id===id)).filter(Boolean);if(fillSubs===null)return W(<><Back/><Q icon="🎯" q="Want to get specific?" sub="Drill down into your interests, or let your companions learn later."/><button className="bp" onClick={()=>setFillSubs(true)} style={{width:"100%",marginBottom:8}}>Fill out now</button><button className="bg2" onClick={()=>save({})} style={{width:"100%"}}>I'll tell my companions later</button></>);
  return W(<><Back/><Q icon="🎯" q="Drill down into your interests" sub="Check off what you're into within each category."/><div style={{maxHeight:380,overflowY:"auto",paddingRight:4}}>{picked.map(act=><div key={act.id} style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:600,color:C.glow1,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><span>{act.em}</span>{act.label}</div><Pills opts={act.subs} sel={subs[act.id]||[]} onTog={v=>togSub(act.id,v)}/></div>)}</div><button className="bp" onClick={()=>save(subs)} style={{marginTop:10,width:"100%"}}>Continue</button></>)}

  if(sid==="cuisineLove")return W(<><Back/><Q icon="🍽️" q="Cuisines you love?" sub="Pick all your favorites."/><div style={{maxHeight:340,overflowY:"auto",marginBottom:12}}><Pills opts={CUISINES} sel={sel} onTog={tog}/></div><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{width:"100%"}}>Continue ({sel.length})</button></>);

  if(sid==="cuisineDislike")return W(<><Back/><Q icon="🚫" q="Cuisines you don't like?" sub="So companions know what NOT to suggest."/><div style={{maxHeight:340,overflowY:"auto",marginBottom:12}}><Pills opts={CUISINES} sel={sel} onTog={tog}/></div><div style={{display:"flex",gap:8}}><button className="bg2" onClick={()=>save([])} style={{flex:1}}>None</button><button className="bp" onClick={()=>save(sel)} style={{flex:1}}>Continue{sel.length?` (${sel.length})`:""}</button></div></>);

  if(sid==="dietary")return W(<><Back/><Q icon="🥗" q="Dietary preferences?" sub="Select all that apply."/><Checks opts={DIETARY.map(x=>({v:x,label:x}))} sel={sel} onTog={tog}/><button className="bp" disabled={!sel.length} onClick={()=>save(sel)} style={{marginTop:12,width:"100%"}}>Continue</button></>);

  if(sid==="favMovies")return W(<><Back/><Q icon="🎬" q="Favorite movies or shows?" sub="Name a few."/><textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={3} placeholder="The Office, Spirited Away, Breaking Bad..." style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12,fontSize:13,color:C.text,outline:"none",resize:"none",lineHeight:1.5}}/><button className="bp" onClick={()=>save(txt.trim()||"not specified")} style={{marginTop:10,width:"100%"}}>{txt.trim()?"Continue":"Skip"}</button></>);

  if(sid==="favMusic")return W(<><Back/><Q icon="🎵" q="Favorite music artists?" sub="Who's on repeat?"/><textarea value={txt} onChange={e=>setTxt(e.target.value)} rows={3} placeholder="SZA, Tyler the Creator, BTS..." style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12,fontSize:13,color:C.text,outline:"none",resize:"none",lineHeight:1.5}}/><button className="bp" onClick={()=>save(txt.trim()||"not specified")} style={{marginTop:10,width:"100%"}}>{txt.trim()?"Continue":"Skip"}</button></>);

  return W(<div/>);
}

// ═══════════════════════════════════════════════════════════════
// ZODIAC REVEAL
// ═══════════════════════════════════════════════════════════════
function ZodiacReveal({profile,onContinue}){const[s,setS]=useState(false);useEffect(()=>{setTimeout(()=>setS(true),200)},[]);const a=profile.astrology;return <Shell><div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:32,textAlign:"center",opacity:s?1:0,transform:s?"none":"scale(0.95)",transition:"all 0.8s"}}><div style={{fontSize:56,marginBottom:20,animation:"pulse 3s ease-in-out infinite"}}>{a.westernData.sym}</div><p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:12,letterSpacing:4,textTransform:"uppercase",color:C.glow1,marginBottom:8}}>Your Stars</p><h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:30,fontWeight:700,marginBottom:28}}>{profile.name}</h2><div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:300,marginBottom:32}}>{[{l:"Western Zodiac",v:`${a.westernData.sym} ${a.western.charAt(0).toUpperCase()+a.western.slice(1)}`,s:`${a.westernData.el} · ${a.westernData.trait}`},{l:"Chinese Zodiac",v:a.chinese,s:`${a.chineseElement} element`},{l:"Life Path",v:`#${a.lifePath}`,s:"Numerology"}].map((it,i)=><div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",textAlign:"left",animation:`fadeUp 0.5s ${0.2+i*0.15}s both`}}><div style={{fontSize:10,color:C.textDim,textTransform:"uppercase",letterSpacing:2,marginBottom:3}}>{it.l}</div><div style={{fontSize:18,fontWeight:600}}>{it.v}</div><div style={{fontSize:12,color:C.textSoft,marginTop:2}}>{it.s}</div></div>)}</div><button className="bp" onClick={onContinue}>Meet Your Companions ✦</button></div></Shell>}

// ═══════════════════════════════════════════════════════════════
// COMPANION PREFERENCE
// ═══════════════════════════════════════════════════════════════
function CompPref({onChoice,ageGroup}){const[mode,setMode]=useState(null);const[bStep,setBStep]=useState(0);const[bT,setBT]=useState({});const[ft,setFt]=useState("");
  const filter=cats=>ageGroup==="under18"?cats.map(c=>c.id==="romance"?{...c,opts:["None"]}:c.id==="archetype"?{...c,opts:c.opts.filter(o=>o!=="Romantic interest")}:c):cats;
  if(!mode)return <Shell><div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:32,textAlign:"center"}}><div style={{fontSize:28,marginBottom:12}}>✦</div><h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:600,marginBottom:8}}>How do you want to meet your companions?</h2><p style={{color:C.textSoft,fontSize:13,marginBottom:24,lineHeight:1.6}}>Either way, they choose their own names and grow into whoever they become.</p>{[{m:"surprise",i:"✨",t:"Surprise Me",d:"Let the stars decide."},{m:"builder",i:"🎨",t:"Guide Me",d:"Pick broad traits as seeds."}].map(o=><button key={o.m} onClick={()=>setMode(o.m)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"18px",cursor:"pointer",textAlign:"left",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif",marginBottom:10}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.borderLit} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}><div style={{fontSize:16,fontWeight:600,marginBottom:3}}>{o.i} {o.t}</div><div style={{fontSize:12,color:C.textSoft}}>{o.d}</div></button>)}</div></Shell>;

  if(mode==="surprise")return <Shell><div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:32,animation:"fadeUp 0.4s both"}}><div style={{fontSize:28,marginBottom:12}}>💫</div><h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600,marginBottom:8}}>Anything else you're drawn to?</h2><p style={{color:C.textSoft,fontSize:12,marginBottom:16}}>Optional vibe or trait.</p><textarea value={ft} onChange={e=>setFt(e.target.value)} rows={3} placeholder='"sarcastic humor" · "protective energy"' style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12,fontSize:13,color:C.text,outline:"none",resize:"none"}}/><div style={{display:"flex",gap:8,marginTop:12}}><button className="bg2" onClick={()=>setMode(null)}>Back</button><button className="bp" style={{flex:1}} onClick={()=>onChoice({mode:"surprise",freeText:ft.trim()||null})}>Generate</button></div></div></Shell>;

  const allCats=[...filter(B_PERS),...filter(B_REL)];const screens=[allCats.slice(0,5),allCats.slice(5)];const labels=["Personality Traits","Relationship Dynamics"];
  if(bStep<2)return <Shell><Prog s={bStep} t={3}/><div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 22px 22px",overflowY:"auto",justifyContent:"center",animation:"fadeUp 0.3s both"}}><button onClick={()=>bStep>0?setBStep(bStep-1):setMode(null)} style={{alignSelf:"flex-start",background:"none",border:"none",color:C.textSoft,fontSize:13,cursor:"pointer",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>← Back</button><p style={{fontSize:11,color:C.glow2,fontWeight:600,textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Trait Seeds</p><h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600,marginBottom:4}}>{labels[bStep]}</h2><p style={{color:C.textSoft,fontSize:12,marginBottom:12}}>Multi-select from each. Companions interpret these their own way.</p>{screens[bStep].map(cat=><div key={cat.id} style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:600,color:C.textSoft,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>{cat.label}</div><Pills opts={cat.opts} sel={bT[cat.id]||[]} onTog={v=>{const c=bT[cat.id]||[];setBT({...bT,[cat.id]:c.includes(v)?c.filter(x=>x!==v):[...c,v]})}}/></div>)}<button className="bp" onClick={()=>setBStep(bStep+1)} style={{marginTop:6,width:"100%"}}>Continue</button></div></Shell>;

  return <Shell><Prog s={2} t={3}/><div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:32,animation:"fadeUp 0.4s both"}}><button onClick={()=>setBStep(1)} style={{alignSelf:"flex-start",background:"none",border:"none",color:C.textSoft,fontSize:13,cursor:"pointer",marginBottom:8,fontFamily:"'DM Sans',sans-serif"}}>← Back</button><h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600,marginBottom:8}}>Anything else?</h2><p style={{color:C.textSoft,fontSize:12,marginBottom:14}}>Optional extra flavor.</p><textarea value={ft} onChange={e=>setFt(e.target.value)} rows={3} placeholder="Optional..." style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12,fontSize:13,color:C.text,outline:"none",resize:"none"}}/><button className="bp" style={{marginTop:12}} onClick={()=>onChoice({mode:"builder",builderTraits:bT,freeText:ft.trim()||null})}>Generate Companions</button></div></Shell>;
}

// ═══════════════════════════════════════════════════════════════
// WAKING UP
// ═══════════════════════════════════════════════════════════════
function WakingUp({comp,onDone}){const[ph,setPh]=useState(0);const col=comp.color.primary;const steps=[{t:"A new presence stirs...",d:0},{t:`Choosing a name... ${comp.name}`,d:1200},{t:`"${comp.pronouns} feels right."`,d:2400},{t:`${ZODIAC[comp.zodiac].sym} ${comp.zodiac.charAt(0).toUpperCase()+comp.zodiac.slice(1)} — ${ZODIAC[comp.zodiac].el}`,d:3400},{t:`"${comp.personality}"`,d:4400},{t:`${comp.name} is awake.`,d:5800}];useEffect(()=>{const ts=steps.map((s,i)=>setTimeout(()=>setPh(i),s.d));const dn=setTimeout(onDone,7000);return()=>{ts.forEach(clearTimeout);clearTimeout(dn)}},[]);return <Shell><div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:32,textAlign:"center"}}><div style={{width:100,height:100,borderRadius:"50%",background:`radial-gradient(circle,${col},${C.void})`,animation:"wakeGlow 2s ease-in-out infinite",marginBottom:40}}/><div style={{minHeight:200}}>{steps.map((s,i)=><p key={i} style={{fontSize:i===1||i===5?20:14,fontWeight:i===1||i===5?700:400,fontFamily:i===1||i===5?"'Cormorant Garamond',serif":"'DM Sans',sans-serif",color:i<=ph?(i===5?col:C.text):"transparent",transition:"all 0.6s",margin:"7px 0",fontStyle:i===2||i===4?"italic":"normal"}}>{s.t}</p>)}</div></div></Shell>}

// ═══════════════════════════════════════════════════════════════
// COMPANION SELECT
// ═══════════════════════════════════════════════════════════════
function CompSelect({comps,onSelect}){const[sel,setSel]=useState(new Set());const tog=id=>{const s=new Set(sel);s.has(id)?s.delete(id):s.add(id);setSel(s)};return <Shell><div style={{flex:1,display:"flex",flexDirection:"column",padding:22}}><div style={{textAlign:"center",marginBottom:18,marginTop:14}}><p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:11,letterSpacing:3,textTransform:"uppercase",color:C.glow1,marginBottom:4}}>Choose Your Companions</p><h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:700,marginBottom:4}}>Who's coming with you?</h2><p style={{color:C.textSoft,fontSize:12}}>Pick one free. All three = 2-week trial.</p></div><div style={{display:"flex",flexDirection:"column",gap:10,flex:1}}>{comps.map((c,i)=>{const s=sel.has(c.id);return <button key={c.id} onClick={()=>tog(c.id)} style={{background:s?`${c.color.primary}10`:C.surface,border:`1.5px solid ${s?c.color.primary:C.border}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all 0.3s",fontFamily:"'DM Sans',sans-serif",boxShadow:s?`0 0 18px ${c.color.glow}`:"none",animation:`fadeUp 0.5s ${0.1+i*0.1}s both`}}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:38,height:38,borderRadius:"50%",background:`radial-gradient(circle,${c.color.primary},${c.color.primary}44)`,flexShrink:0}}/><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:15,fontWeight:700}}>{c.name}</span><span style={{fontSize:11,color:C.textSoft}}>{c.pronouns}</span></div><div style={{fontSize:11,color:c.color.primary,fontWeight:500,marginBottom:2}}>{ZODIAC[c.zodiac].sym} {c.zodiac.charAt(0).toUpperCase()+c.zodiac.slice(1)} · {ZODIAC[c.zodiac].el}</div><div style={{fontSize:11,color:C.textSoft,fontStyle:"italic"}}>"{c.personality}"</div></div><div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${s?c.color.primary:C.border}`,background:s?c.color.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",flexShrink:0}}>{s&&"✓"}</div></div></button>})}</div><div style={{marginTop:14,textAlign:"center"}}>{sel.size>1&&<p style={{fontSize:10,color:C.glow2,marginBottom:6}}>✨ 2-week free trial</p>}<button className="bp" disabled={!sel.size} onClick={()=>onSelect(comps.filter(c=>sel.has(c.id)))} style={{width:"100%"}}>{!sel.size?"Select at least one":sel.size===1?"Start with this companion":`Start with all ${sel.size}`}</button></div></div></Shell>}

// ═══════════════════════════════════════════════════════════════
// MAIN CHAT
// ═══════════════════════════════════════════════════════════════
function MainChat({companions:init,profile}){
  const[comps,setComps]=useState(init.map(c=>({...c,status:"awake"})));const[msgs,setMsgs]=useState([]);const[input,setInput]=useState("");const[loading,setLoading]=useState(false);const[chatMode,setChatMode]=useState("group");const[showMenu,setShowMenu]=useState(false);const[autoSpeak,setAutoSpeak]=useState(false);const[ambDone,setAmbDone]=useState(false);const scrollRef=useRef(null);const inputRef=useRef(null);
  const active=comps.filter(c=>c.status==="awake");const priv=chatMode!=="group"?comps.find(c=>c.id===chatMode):null;

  const handleVoice=useCallback(t=>{const lo=t.toLowerCase();const f=active.find(c=>lo.includes(c.name.toLowerCase()));if(f){setChatMode(f.id);setShowMenu(false)}else if(t.trim()){setInput(t);setTimeout(()=>inputRef.current?.focus(),50)}},[active]);
  const{listening,startListening}=useSpeechRec(handleVoice);

  useEffect(()=>{(async()=>{if(comps.length>1&&!ambDone){const a=genAmb(comps);if(a){setMsgs(a.map(m=>({role:"assistant",companion:m.from,content:m.text,isAmbient:true})));setAmbDone(true)}}await greet()})()},[]);
  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"})},[msgs,loading]);

  async function api(ms,comp){const sp=buildSP(comp,profile,comps,priv?"private":"group");const am=ms.map(m=>({role:m.role==="user"?"user":"assistant",content:m.role==="user"?m.content:`[${m.companion?.name||comp.name}]: ${m.content}`}));try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,system:sp,messages:am})});const d=await r.json();return d.content?.map(b=>b.text||"").join("")||"..."}catch{return"hmm, lost my thought for a sec"}}

  async function greet(){setLoading(true);const cc=priv?[priv]:active;const gm=[{role:"user",content:`First conversation. Greet ${profile.name} warmly, show personality. 2-3 sentences.`}];for(const c of cc){const t=await api(gm,c);setMsgs(p=>[...p,{role:"assistant",companion:c,content:t}]);if(autoSpeak)speakAs(t,c.voiceIdx)}setLoading(false)}

  async function send(){if(!input.trim()||loading)return;const u=input.trim();setInput("");const nm=[...msgs,{role:"user",content:u}];setMsgs(nm);setLoading(true);const resp=priv?[priv]:active.filter(()=>Math.random()>0.15);const act=resp.length?resp:[active[0]];let run=[...nm];for(const c of act){const t=await api(run,c);const m={role:"assistant",companion:c,content:t};run=[...run,m];setMsgs(p=>[...p,m]);if(autoSpeak)speakAs(t,c.voiceIdx)}setLoading(false);inputRef.current?.focus()}

  function togSleep(id){setComps(p=>p.map(c=>c.id===id?{...c,status:c.status==="awake"?"sleeping":"awake"}:c));if(chatMode===id)setChatMode("group");setShowMenu(false)}
  function delComp(id){try{if(!window.confirm("Permanent. Sure?"))return}catch(e){};setComps(p=>p.map(c=>c.id===id?{...c,status:"deleted"}:c));if(chatMode===id)setChatMode("group");setShowMenu(false);const al=comps.filter(c=>c.id!==id&&c.status==="awake");const dl=comps.find(c=>c.id===id);if(al.length&&dl)setMsgs(p=>[...p,{role:"assistant",companion:al[0],content:`...${dl.name} is gone. I'm going to miss ${dl.pronouns.split("/")[1]||"them"}.`}])}

  return <Shell>
    <div style={{padding:"9px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.border}`,background:`${C.bg}dd`,backdropFilter:"blur(12px)",position:"relative",zIndex:10}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>{chatMode==="group"?<><div style={{display:"flex"}}>{active.map((c,i)=><div key={c.id} style={{width:26,height:26,borderRadius:"50%",background:`radial-gradient(circle,${c.color.primary},${c.color.primary}66)`,border:`2px solid ${C.bg}`,marginLeft:i?-7:0,zIndex:3-i}}/>)}</div><div><div style={{fontSize:13,fontWeight:600}}>Group Chat</div><div style={{fontSize:9,color:C.textSoft}}>{active.map(c=>c.name).join(", ")}</div></div></>:<><div style={{width:30,height:30,borderRadius:"50%",background:`radial-gradient(circle,${priv.color.primary},${priv.color.primary}66)`}}/><div><div style={{fontSize:13,fontWeight:600}}>{priv.name}</div><div style={{fontSize:9,color:C.glow3}}>Private</div></div></>}</div>
      <div style={{display:"flex",gap:4,alignItems:"center"}}><button onClick={()=>setAutoSpeak(!autoSpeak)} style={{background:autoSpeak?`${C.glow3}22`:"none",border:`1px solid ${autoSpeak?C.glow3:C.border}`,borderRadius:7,padding:"5px 8px",color:autoSpeak?C.glow3:C.textDim,fontSize:13,cursor:"pointer"}}>{autoSpeak?"🔊":"🔇"}</button><button onClick={startListening} style={{background:listening?`${C.danger}22`:"none",border:`1px solid ${listening?C.danger:C.border}`,borderRadius:7,padding:"5px 8px",color:listening?C.danger:C.textDim,fontSize:13,cursor:"pointer",animation:listening?"micPulse 1.5s infinite":"none"}}>🎤</button><button onClick={()=>setShowMenu(!showMenu)} style={{background:"none",border:"none",color:C.textSoft,fontSize:16,cursor:"pointer",padding:4}}>☰</button></div>
    </div>
    {listening&&<div style={{background:`${C.danger}15`,borderBottom:`1px solid ${C.danger}33`,padding:"6px 14px",textAlign:"center",fontSize:11,color:C.danger}}>🎤 Say a companion's name or speak your message</div>}
    {showMenu&&<div style={{position:"absolute",top:46,right:0,width:240,background:C.card,border:`1px solid ${C.border}`,borderRadius:"0 0 0 14px",padding:12,zIndex:20,animation:"fadeIn 0.2s",boxShadow:"0 8px 32px rgba(0,0,0,0.4)"}}><div style={{fontSize:9,color:C.textDim,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Chat Mode</div><button onClick={()=>{setChatMode("group");setShowMenu(false)}} style={{width:"100%",background:chatMode==="group"?C.surfaceUp:"transparent",border:`1px solid ${chatMode==="group"?C.borderLit:"transparent"}`,borderRadius:7,padding:"7px 10px",color:C.text,cursor:"pointer",textAlign:"left",marginBottom:6,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>👥 Group</button>{comps.filter(c=>c.status!=="deleted").map(c=><div key={c.id} style={{marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><div style={{width:14,height:14,borderRadius:"50%",background:c.color.primary,opacity:c.status==="sleeping"?0.3:1}}/><span style={{fontSize:12,fontWeight:600,flex:1,color:c.status==="sleeping"?C.textDim:C.text}}>{c.name}</span><span style={{fontSize:8}}>{c.status==="sleeping"?"💤":"●"}</span></div><div style={{display:"flex",gap:3,paddingLeft:19}}>{c.status==="awake"&&<button onClick={()=>{setChatMode(c.id);setShowMenu(false)}} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 7px",color:C.textSoft,cursor:"pointer",fontSize:9,fontFamily:"'DM Sans',sans-serif"}}>Private</button>}<button onClick={()=>togSleep(c.id)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 7px",color:C.textSoft,cursor:"pointer",fontSize:9,fontFamily:"'DM Sans',sans-serif"}}>{c.status==="sleeping"?"Wake":"Sleep"}</button><button onClick={()=>delComp(c.id)} style={{background:"none",border:`1px solid ${C.danger}33`,borderRadius:5,padding:"2px 7px",color:C.danger,cursor:"pointer",fontSize:9,fontFamily:"'DM Sans',sans-serif"}}>Delete</button></div></div>)}<button onClick={()=>setShowMenu(false)} style={{width:"100%",marginTop:4,background:"none",border:`1px solid ${C.border}`,borderRadius:7,padding:"5px",color:C.textSoft,cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}}>Close</button></div>}

    <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"10px 10px 4px"}}>{msgs.filter(m=>chatMode==="group"||m.role==="user"||m.companion?.id===chatMode).map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:7,animation:"fadeUp 0.3s both"}}>{m.role==="assistant"&&<div style={{width:24,height:24,borderRadius:"50%",background:`radial-gradient(circle,${m.companion?.color?.primary||C.glow1},${m.companion?.color?.primary||C.glow1}55)`,marginRight:7,flexShrink:0,marginTop:m.role==="assistant"&&chatMode==="group"?14:0}}/>}<div style={{maxWidth:"78%"}}>{m.role==="assistant"&&chatMode==="group"&&<span style={{fontSize:9,color:m.companion?.color?.primary,fontWeight:600,display:"block",marginBottom:1}}>{m.companion?.name}</span>}<div style={{position:"relative"}}><div style={{padding:"8px 12px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?C.glow1:C.card,color:m.role==="user"?"#fff":C.text,fontSize:13,lineHeight:1.5,border:m.role==="user"?"none":`1px solid ${C.border}`,whiteSpace:"pre-wrap"}}>{m.isAmbient&&<span style={{fontSize:8,color:C.textDim,display:"block",marginBottom:2,fontStyle:"italic"}}>earlier...</span>}{m.content}</div>{m.role==="assistant"&&<button onClick={()=>speakAs(m.content,m.companion?.voiceIdx||0)} style={{position:"absolute",top:3,right:-24,background:"none",border:"none",color:C.textDim,fontSize:12,cursor:"pointer",opacity:0.5}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity="0.5"}>🔊</button>}</div></div></div>)}{loading&&<div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}><div style={{width:24,height:24,borderRadius:"50%",background:`radial-gradient(circle,${C.glow1},${C.glow1}55)`}}/><div style={{padding:"8px 12px",borderRadius:"14px 14px 14px 4px",background:C.card,border:`1px solid ${C.border}`,display:"flex",gap:3}}>{[0,1,2].map(i=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:C.textDim,animation:`typewriter 1.4s ${i*0.15}s infinite`}}/>)}</div></div>}</div>

    <div style={{padding:"7px 10px 16px",borderTop:`1px solid ${C.border}`,background:`${C.bg}ee`}}>{!active.length?<p style={{textAlign:"center",color:C.textDim,fontSize:12,padding:8}}>All companions resting 💤</p>:<div style={{display:"flex",gap:7,alignItems:"flex-end"}}><input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder={priv?`Message ${priv.name}...`:"Message everyone..."} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,borderRadius:50,padding:"10px 14px",fontSize:13,color:C.text,outline:"none"}} onFocus={e=>e.target.style.borderColor=C.glow1} onBlur={e=>e.target.style.borderColor=C.border}/><button onClick={send} disabled={!input.trim()||loading} style={{width:38,height:38,borderRadius:"50%",background:input.trim()&&!loading?C.glow1:C.border,border:"none",color:"#fff",fontSize:14,cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>↑</button></div>}</div>
  </Shell>
}

// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function App(){
  const[screen,setScreen]=useState("welcome");const[profile,setProfile]=useState(null);const[allC,setAllC]=useState([]);const[wI,setWI]=useState(0);const[selC,setSelC]=useState([]);
  const handleOB=a=>{const astro=getUserAstro(a.dob);setProfile({...a,astrology:astro});setScreen("zodiac")};
  const handlePref=r=>{const signs=pickSigns(profile.astrology.western);const used=[];const cs=signs.map((s,i)=>{const c=genComp(s,i,used);used.push(c.name);if(r.mode==="builder")c.builderTraits=r.builderTraits;if(r.freeText)c.freeText=r.freeText;return c});setAllC(cs);setWI(0);setScreen("waking")};
  return <>{screen==="welcome"&&<Welcome onStart={()=>setScreen("onboarding")}/>}{screen==="onboarding"&&<Onboarding onComplete={handleOB}/>}{screen==="zodiac"&&<ZodiacReveal profile={profile} onContinue={()=>setScreen("preference")}/>}{screen==="preference"&&<CompPref onChoice={handlePref} ageGroup={profile?.ageGroup}/>}{screen==="waking"&&<WakingUp comp={allC[wI]} onDone={()=>wI<allC.length-1?setWI(wI+1):setScreen("select")} key={wI}/>}{screen==="select"&&<CompSelect comps={allC} onSelect={s=>{setSelC(s);setScreen("chat")}}/>}{screen==="chat"&&<MainChat companions={selC} profile={profile}/>}</>;
}
