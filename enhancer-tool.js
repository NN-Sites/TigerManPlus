// ---------- parameters ----------
const PARAMS = [
  // id, label, min, max, step, default, group
  ['antiRing','מניעת הילות (Anti-ring)',0,1,.01,.6,'up'],
  ['denoise','הסרת רעש (Denoise)',0,1,.01,.15,'detail'],
  ['sharpen','חידוד חכם (CAS)',0,1,.01,.45,'detail'],
  ['clarity','בהירות פרטים (Clarity)',0,1,.01,.2,'detail'],
  ['deband','הסרת פסים (Deband)',0,1,.01,.5,'detail'],
  ['exposure','חשיפה',-2,2,.01,0,'light'],
  ['contrast','ניגודיות',-1,1,.01,0,'light'],
  ['highlights','הבהרות',-1,1,.01,0,'light'],
  ['shadows','צללים',-1,1,.01,0,'light'],
  ['gamma','גמא',.5,2,.01,1,'light'],
  ['saturation','רוויה',-1,1,.01,0,'color'],
  ['vibrance','חיוניות (Vibrance)',-1,1,.01,0,'color'],
  ['temperature','טמפרטורה',-1,1,.01,0,'color'],
  ['tint','גוון',-1,1,.01,0,'color'],
  ['vignette','וינייטה',0,1,.01,0,'fx'],
  ['grain','גרעין קולנועי',0,1,.01,0,'fx'],
];
const P = {};
PARAMS.forEach(p => P[p[0]] = p[5]);

const PRESETS = {
  '🤖 AI אוטומטי': {auto:true, denoise:.2, sharpen:.5, clarity:.25, deband:.6, antiRing:.7, vibrance:.15},
  '⚖️ מאוזן': {denoise:.15, sharpen:.45, clarity:.2, deband:.5, antiRing:.6},
  '📼 צילום ישן': {scale:'x2', denoise:.6, sharpen:.7, clarity:.35, deband:.85, antiRing:.85, contrast:.1, vibrance:.25},
  '🌙 תאורה חלשה': {denoise:.8, exposure:.45, shadows:.4, highlights:-.1, sharpen:.3, clarity:.1, deband:.8},
  '🎌 אנימה': {scale:'x2', denoise:.45, sharpen:.85, clarity:.1, deband:1, antiRing:1, vibrance:.3},
  '🎬 קולנועי': {contrast:.15, saturation:-.1, temperature:.12, vignette:.35, grain:.18, highlights:-.3, shadows:.1, sharpen:.35},
  '📱 סושיאל פופ': {vibrance:.45, clarity:.4, sharpen:.55, contrast:.12, shadows:.15},
  '🚀 4K Ultra': {scale:'h2160', denoise:.25, sharpen:.6, clarity:.3, deband:.6, antiRing:.75},
};

// ---------- UI ----------
const $ = id => document.getElementById(id);
const fmtV = (v,s) => s < 1 ? (+v).toFixed(2) : v;
PARAMS.forEach(([id,label,min,max,step,def,g]) => {
  const d = document.createElement('div'); d.className='row';
  d.innerHTML = `<label>${label}<b id="v-${id}">${fmtV(def,step)}</b></label><input type="range" id="p-${id}" min="${min}" max="${max}" step="${step}" value="${def}">`;
  $('g-'+g).appendChild(d);
  const r = d.querySelector('input');
  r.addEventListener('input', () => { P[id] = +r.value; $('v-'+id).textContent = fmtV(r.value,step); clearPreset(); dirty = true; });
  r.addEventListener('dblclick', () => setParam(id, def));
});
function setParam(id, v){ P[id]=v; $('p-'+id).value=v; $('v-'+id).textContent = fmtV(v,.01); dirty = true; }
function clearPreset(){ document.querySelectorAll('.preset').forEach(b=>b.classList.remove('on')); }
Object.entries(PRESETS).forEach(([name, cfg]) => {
  const b = document.createElement('button'); b.className='preset'; b.textContent=name;
  b.onclick = () => {
    PARAMS.forEach(p => setParam(p[0], p[5]));
    Object.entries(cfg).forEach(([k,v]) => { if (k in P) setParam(k, v); });
    if (cfg.scale) { $('scale').value = cfg.scale; resize(); }
    if (cfg.auto) autoEnhance();
    clearPreset(); b.classList.add('on');
  };
  $('presets').appendChild(b);
});
$('resetBtn').onclick = () => { PARAMS.forEach(p => setParam(p[0], p[5])); $('scale').value='x2'; resize(); clearPreset(); };
$('scale').onchange = resize;

// ---------- WebGL ----------
const canvas = $('out');
const gl = canvas.getContext('webgl2', {premultipliedAlpha:false, antialias:false});
if (!gl) alert('הדפדפן שלך לא תומך ב-WebGL2. נסה Chrome או Edge.');
const MAXTEX = gl.getParameter(gl.MAX_TEXTURE_SIZE);

const VS = `#version 300 es
out vec2 v; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); v=p; gl_Position=vec4(p*2.-1.,0,1); }`;

const FS_DENOISE = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D t; uniform vec2 px; uniform float dn;
void main(){
  vec3 c=texture(t,v).rgb;
  if(dn<.001){o=vec4(c,1);return;}
  float sr=mix(.03,.2,dn), inv=1./(2.*sr*sr);
  vec3 s=vec3(0); float ws=0.;
  for(int y=-2;y<=2;y++) for(int x=-2;x<=2;x++){
    vec2 d=vec2(x,y); vec3 q=texture(t,v+d*px).rgb; vec3 e=q-c;
    float w=exp(-dot(d,d)*.18-dot(e,e)*inv); s+=q*w; ws+=w;
  }
  o=vec4(mix(c,s/ws,min(1.,dn*1.4)),1);
}`;

// Catmull-Rom bicubic (9 bilinear taps) + anti-ringing clamp
const FS_UPSCALE = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D t; uniform vec2 sz; uniform float ar;
void main(){
  vec2 sp=v*sz, tp=floor(sp-.5)+.5, f=sp-tp;
  vec2 w0=f*(-.5+f*(1.-.5*f)), w1=1.+f*f*(-2.5+1.5*f), w2=f*(.5+f*(2.-1.5*f)), w3=f*f*(-.5+.5*f);
  vec2 w12=w1+w2, o12=w2/w12;
  vec2 a=(tp-1.)/sz, b=(tp+2.)/sz, m=(tp+o12)/sz;
  vec3 r=texture(t,vec2(a.x,a.y)).rgb*w0.x*w0.y + texture(t,vec2(m.x,a.y)).rgb*w12.x*w0.y + texture(t,vec2(b.x,a.y)).rgb*w3.x*w0.y
        +texture(t,vec2(a.x,m.y)).rgb*w0.x*w12.y+ texture(t,vec2(m.x,m.y)).rgb*w12.x*w12.y+ texture(t,vec2(b.x,m.y)).rgb*w3.x*w12.y
        +texture(t,vec2(a.x,b.y)).rgb*w0.x*w3.y + texture(t,vec2(m.x,b.y)).rgb*w12.x*w3.y + texture(t,vec2(b.x,b.y)).rgb*w3.x*w3.y;
  vec2 p0=tp/sz, d=1./sz;
  vec3 c1=texture(t,p0).rgb, c2=texture(t,p0+vec2(d.x,0)).rgb, c3=texture(t,p0+vec2(0,d.y)).rgb, c4=texture(t,p0+d).rgb;
  vec3 mn=min(min(c1,c2),min(c3,c4)), mx=max(max(c1,c2),max(c3,c4));
  o=vec4(mix(r,clamp(r,mn,mx),ar),1);
}`;

const FS_FINAL = `#version 300 es
precision highp float; in vec2 v; out vec4 o;
uniform sampler2D t, src; uniform vec2 px; uniform float split, time;
uniform float sharpen, clarity, deband, expo, con, hi, sh, gam, sat, vib, temp, tint, vig, grain;
const vec3 LW=vec3(.2126,.7152,.0722);
float hash(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p.yx+19.19); return fract((p.x+p.y)*p.x); }
vec3 T(vec2 d){ return texture(t,v+d*px).rgb; }
void main(){
  if(split>=0. && v.x<split){
    vec3 c=texture(src,v).rgb;
    if(abs(v.x-split)<px.x*2.) c=vec3(1);
    o=vec4(c,1); return;
  }
  vec3 e=T(vec2(0)), b=T(vec2(0,-1)), d=T(vec2(-1,0)), f=T(vec2(1,0)), h=T(vec2(0,1));
  vec3 c=e;
  // AMD-style contrast adaptive sharpening
  if(sharpen>0.){
    vec3 mn=min(min(min(d,e),min(f,b)),h), mx=max(max(max(d,e),max(f,b)),h);
    vec3 amp=sqrt(clamp(min(mn,2.-mx)/max(mx,1e-4),0.,1.));
    float peak=-1./mix(8.,4.2,sharpen);
    vec3 w=amp*peak;
    c=clamp((b*w+d*w+f*w+h*w+e)/(1.+4.*w),0.,1.);
  }
  // clarity: local contrast on luma
  if(clarity>0.){
    float r=3.;
    vec3 bl=(T(vec2(r,0))+T(vec2(-r,0))+T(vec2(0,r))+T(vec2(0,-r))+T(vec2(r,r)*.7)+T(vec2(-r,r)*.7)+T(vec2(r,-r)*.7)+T(vec2(-r,-r)*.7))*.125;
    float l=dot(c,LW), lb=dot(bl,LW);
    float m=1.-abs(l-.5)*1.2;
    c+= (l-lb)*clarity*1.6*m;
  }
  // light
  c*=exp2(expo);
  c*=vec3(1.+temp*.12, 1.+tint*.08, 1.-temp*.12);
  float l=dot(c,LW);
  c+= sh*.35*(1.-smoothstep(0.,.55,l)) + hi*.3*smoothstep(.45,1.,l);
  c=(c-.5)*(1.+con)+.5;
  c=max(c,0.);
  // color
  l=dot(c,LW);
  float s=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
  c=mix(vec3(l),c,max(0.,1.+sat+vib*(1.-s)*1.3));
  c=pow(max(c,0.),vec3(1./gam));
  // fx
  vec2 q=v-.5; c*=1.-vig*dot(q,q)*2.;
  vec2 fp=gl_FragCoord.xy;
  c+=(hash(fp+time*61.)-.5)*grain*.14;
  c+=(hash(fp*1.37+time)-hash(fp*0.71-time))*deband*(2./255.);
  o=vec4(clamp(c,0.,1.),1);
}`;

function prog(fs){
  const p=gl.createProgram();
  [[gl.VERTEX_SHADER,VS],[gl.FRAGMENT_SHADER,fs]].forEach(([t,s])=>{
    const sh=gl.createShader(t); gl.shaderSource(sh,s); gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
    gl.attachShader(p,sh);
  });
  gl.linkProgram(p);
  const u={}; const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
  for(let i=0;i<n;i++){ const nm=gl.getActiveUniform(p,i).name; u[nm]=gl.getUniformLocation(p,nm); }
  return {p,u};
}
const pDen=prog(FS_DENOISE), pUp=prog(FS_UPSCALE), pFin=prog(FS_FINAL);
gl.bindVertexArray(gl.createVertexArray());

function tex(w,h){
  const t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  if(w) gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  return t;
}
function fbo(t){ const f=gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0); return f; }

const texSrc=tex();
let texDen,fbDen,texUp,fbUp, SW=0,SH=0,OW=0,OH=0;

// ---------- video ----------
const video=$('vid');
let dirty=false, split=.5, compare=false, loaded=false, exporting=false;

function computeOut(){
  const s=$('scale').value; let k;
  if(s[0]==='x') k=+s.slice(1); else k=(+s.slice(1))/SH;
  let w=Math.round(SW*k/2)*2, h=Math.round(SH*k/2)*2;
  const lim=Math.min(MAXTEX,8192);
  if(w>lim||h>lim){ const r=lim/Math.max(w,h); w=Math.round(w*r/2)*2; h=Math.round(h*r/2)*2; }
  return [w,h];
}
function resize(){
  if(!loaded) return;
  SW=video.videoWidth; SH=video.videoHeight;
  [OW,OH]=computeOut();
  canvas.width=OW; canvas.height=OH;
  [texDen,texUp].forEach(t=>t&&gl.deleteTexture(t));
  [fbDen,fbUp].forEach(f=>f&&gl.deleteFramebuffer(f));
  texDen=tex(SW,SH); fbDen=fbo(texDen);
  texUp=tex(OW,OH); fbUp=fbo(texUp);
  updateZoom(); dirty=true;
}

function render(){
  if(!loaded||video.readyState<2) return;
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.bindTexture(gl.TEXTURE_2D,texSrc);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,video);
  // pass 1: denoise @ source res
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbDen); gl.viewport(0,0,SW,SH);
  gl.useProgram(pDen.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texSrc);
  gl.uniform1i(pDen.u.t,0); gl.uniform2f(pDen.u.px,1/SW,1/SH); gl.uniform1f(pDen.u.dn,P.denoise);
  gl.drawArrays(gl.TRIANGLES,0,3);
  // pass 2: upscale
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbUp); gl.viewport(0,0,OW,OH);
  gl.useProgram(pUp.p); gl.bindTexture(gl.TEXTURE_2D,texDen);
  gl.uniform1i(pUp.u.t,0); gl.uniform2f(pUp.u.sz,SW,SH); gl.uniform1f(pUp.u.ar,P.antiRing);
  gl.drawArrays(gl.TRIANGLES,0,3);
  // pass 3: sharpen + grade
  gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,OW,OH);
  const u=pFin.u; gl.useProgram(pFin.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,texUp);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,texSrc);
  gl.uniform1i(u.t,0); gl.uniform1i(u.src,1);
  gl.uniform2f(u.px,1/OW,1/OH);
  gl.uniform1f(u.split, compare&&!exporting ? split : -1);
  gl.uniform1f(u.time, (performance.now()/1000)%100);
  const m={sharpen:'sharpen',clarity:'clarity',deband:'deband',expo:'exposure',con:'contrast',hi:'highlights',sh:'shadows',gam:'gamma',sat:'saturation',vib:'vibrance',temp:'temperature',tint:'tint',vig:'vignette',grain:'grain'};
  for(const k in m) gl.uniform1f(u[k],P[m[k]]);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.activeTexture(gl.TEXTURE0);
  frames++;
}

let frames=0, lastT=performance.now(), fps=0;
function loop(){
  if(loaded && (!video.paused || dirty)) { render(); dirty=false; }
  const now=performance.now();
  if(now-lastT>500){ fps=frames*1000/(now-lastT); frames=0; lastT=now; updateStats(); }
  if(loaded && !$('seek').matches(':active')) $('seek').value = video.duration ? video.currentTime/video.duration*1000 : 0;
  $('time').textContent = fmtT(video.currentTime)+' / '+fmtT(video.duration||0);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
const fmtT=s=>{s=Math.max(0,s|0);return (s/60|0)+':'+String(s%60).padStart(2,'0');};
function updateStats(){
  if(!loaded) return;
  $('stats').innerHTML=`${SW}×${SH} → <b>${OW}×${OH}</b> · ${fps.toFixed(0)} fps`;
}

function loadFile(f){
  if(!f||!f.type.startsWith('video')&&!/\.(mkv|mov|mp4|webm|avi)$/i.test(f.name)) return;
  if(video.src) URL.revokeObjectURL(video.src);
  video.src=URL.createObjectURL(f); video.loop=false; video.muted=false;
  fileName=f.name.replace(/\.[^.]+$/,'');
}
let fileName='video';
video.addEventListener('loadeddata',()=>{
  loaded=true; $('drop').hidden=true; canvas.hidden=false;
  ['playBtn','seek','cmpBtn','zoomBtn','snapBtn','exportBtn'].forEach(i=>$(i).disabled=false);
  resize(); render();
});
video.addEventListener('seeked',()=>{dirty=true;});
video.addEventListener('play',()=>$('playBtn').textContent='⏸');
video.addEventListener('pause',()=>$('playBtn').textContent='▶');

$('openBtn').onclick=()=>$('file').click();
$('drop').onclick=()=>$('file').click();
$('file').onchange=e=>loadFile(e.target.files[0]);
['dragenter','dragover'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$('drop').classList.add('hover');}));
['dragleave','drop'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$('drop').classList.remove('hover');}));
document.addEventListener('drop',e=>loadFile(e.dataTransfer.files[0]));

$('playBtn').onclick=()=>{ if(exporting) return; video.paused?video.play():video.pause(); };
$('seek').oninput=e=>{ if(video.duration) video.currentTime=e.target.value/1000*video.duration; };
document.addEventListener('keydown',e=>{ if(e.code==='Space'&&loaded&&e.target.tagName!=='INPUT'&&e.target.tagName!=='SELECT'){e.preventDefault();$('playBtn').click();} });

// compare split
$('cmpBtn').onclick=()=>{ compare=!compare; $('cmpBtn').classList.toggle('primary',compare); $('tagL').hidden=$('tagR').hidden=!compare; dirty=true; };
function setSplit(e){
  const r=canvas.getBoundingClientRect();
  split=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)); dirty=true;
}
let dragging=false;
canvas.addEventListener('pointerdown',e=>{ if(!compare) $('cmpBtn').click(); dragging=true; setSplit(e); });
window.addEventListener('pointermove',e=>{ if(dragging) setSplit(e); });
window.addEventListener('pointerup',()=>dragging=false);

// 1:1 zoom
let zoom=false;
$('zoomBtn').onclick=()=>{ zoom=!zoom; $('zoomBtn').classList.toggle('primary',zoom); updateZoom(); };
function updateZoom(){
  const vp=$('vp'); vp.classList.toggle('fit',!zoom);
  vp.style.placeItems = zoom ? 'start' : 'center';
  canvas.style.width = zoom ? (OW/devicePixelRatio)+'px' : '';
  canvas.style.height = zoom ? (OH/devicePixelRatio)+'px' : '';
}

// ---------- AI auto enhance (frame analysis) ----------
function autoEnhance(){
  if(!loaded||video.readyState<2) return;
  const c=document.createElement('canvas'); c.width=128; c.height=72;
  const x=c.getContext('2d',{willReadFrequently:true}); x.drawImage(video,0,0,128,72);
  const d=x.getImageData(0,0,128,72).data; const n=d.length/4;
  let r=0,g=0,b=0,l=0,l2=0,lap=0; const L=new Float32Array(n);
  for(let i=0;i<n;i++){ const R=d[i*4]/255,G=d[i*4+1]/255,B=d[i*4+2]/255; r+=R;g+=G;b+=B; const y=.2126*R+.7152*G+.0722*B; L[i]=y; l+=y; l2+=y*y; }
  r/=n;g/=n;b/=n;l/=n; const sd=Math.sqrt(Math.max(0,l2/n-l*l));
  for(let y=1;y<71;y++)for(let x2=1;x2<127;x2++){const i=y*128+x2; lap+=Math.abs(4*L[i]-L[i-1]-L[i+1]-L[i-128]-L[i+128]);}
  lap/=126*70;
  const cl=(v,a,b2)=>Math.min(b2,Math.max(a,v));
  setParam('exposure', +cl(Math.log2(.46/Math.max(l,.02))*.75,-1.2,1.2).toFixed(2));
  setParam('contrast', +cl((.22-sd)*2.2,-.3,.45).toFixed(2));
  setParam('temperature', +cl((b-r)*2.2,-.5,.5).toFixed(2));
  setParam('tint', +cl(((r+b)/2-g)*2.5,-.4,.4).toFixed(2));
  setParam('shadows', l<.35 ? .25 : 0);
  setParam('highlights', l>.6 ? -.25 : 0);
  setParam('denoise', +cl(.1+(l<.3?.3:0)+lap*2,.1,.8).toFixed(2));
  const sat=Math.max(r,g,b)-Math.min(r,g,b);
  setParam('vibrance', +cl(.35-sat*1.5,0,.4).toFixed(2));
}

// ---------- snapshot ----------
$('snapBtn').onclick=()=>{
  const c=compare; compare=false; render(); compare=c;
  canvas.toBlob(b=>save(b,`${fileName}_enhanced_${OW}x${OH}.png`),'image/png');
  dirty=true;
};
function save(blob,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),5000); }

// ---------- export ----------
let audioCtx, audioDest;
function pickMime(){
  const list=['video/mp4;codecs=avc1.640033,mp4a.40.2','video/mp4;codecs=avc1,mp4a','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  return list.find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m));
}
$('exportBtn').onclick=async()=>{
  if(exporting){ video.pause(); return; }
  const mime=pickMime(); if(!mime){ alert('הדפדפן לא תומך בהקלטת וידאו. נסה Chrome/Edge.'); return; }
  const stream=canvas.captureStream(60);
  if($('withAudio').checked){
    try{
      if(!audioCtx){ audioCtx=new AudioContext(); const s=audioCtx.createMediaElementSource(video); audioDest=audioCtx.createMediaStreamDestination(); s.connect(audioDest); s.connect(audioCtx.destination); }
      await audioCtx.resume();
      audioDest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
    }catch(e){ console.warn('audio',e); }
  }
  const bps=Math.min(150e6,Math.max(8e6,OW*OH*30*(+$('quality').value)));
  const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bps,audioBitsPerSecond:256000});
  const chunks=[]; rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const ext=mime.includes('mp4')?'mp4':'webm';
  rec.onstop=()=>{
    save(new Blob(chunks,{type:mime.split(';')[0]}),`${fileName}_enhanced_${OW}x${OH}.${ext}`);
    finish();
  };
  const pr=$('prog'), bar=pr.querySelector('i');
  exporting=true; pr.style.display='block';
  $('exportBtn').textContent='⏹ עצור ייצוא';
  document.querySelectorAll('aside input,aside select,#seek,#playBtn').forEach(e=>e.disabled=true);
  const tick=setInterval(()=>{ bar.style.width=(video.currentTime/video.duration*100)+'%'; },200);
  const onEnd=()=>{ if(rec.state!=='inactive') rec.stop(); };
  function finish(){
    clearInterval(tick); exporting=false; pr.style.display='none'; bar.style.width='0';
    $('exportBtn').textContent='⬇ ייצוא וידאו';
    document.querySelectorAll('aside input,aside select,#seek,#playBtn').forEach(e=>e.disabled=false);
    video.removeEventListener('ended',onEnd); video.removeEventListener('pause',onEnd);
    dirty=true;
  }
  video.pause(); video.currentTime=0;
  await Promise.race([new Promise(r=>video.addEventListener('seeked',r,{once:true})), new Promise(r=>setTimeout(r,800))]);
  render();
  rec.start(1000);
  await video.play();
  video.addEventListener('ended',onEnd,{once:true});
  video.addEventListener('pause',onEnd,{once:true});
};

// ---------- זום וגרירה עם הגלגלת ----------
(function () {
  const vp = $('vp'), cv = $('out');
  let s = 1, x = 0, y = 0, pan = null;
  const MIN = 1, MAX = 16;
  const apply = () => {
    cv.style.transformOrigin = '50% 50%';
    cv.style.transform = s === 1 && !x && !y ? '' : `translate(${x}px,${y}px) scale(${s})`;
    cv.style.cursor = s > 1 ? (pan ? 'grabbing' : 'grab') : '';
    if (!zoom) vp.style.overflow = s > 1 ? 'hidden' : '';
    const z = $('zoomLevel'); if (z) { z.textContent = Math.round(s * 100) + '%'; z.hidden = s === 1; }
  };
  const reset = () => { s = 1; x = y = 0; apply(); };
  vp.addEventListener('wheel', (e) => {
    if (!loaded) return;
    e.preventDefault();
    const r = vp.getBoundingClientRect();
    const px = e.clientX - (r.left + r.width / 2), py = e.clientY - (r.top + r.height / 2);
    const s2 = Math.min(MAX, Math.max(MIN, s * Math.exp(-e.deltaY * 0.0015)));
    if (s2 === s) return;
    x = px - (px - x) * s2 / s; y = py - (py - y) * s2 / s; s = s2;
    if (s === 1) { x = y = 0; }
    apply();
  }, { passive: false });
  cv.addEventListener('pointerdown', (e) => {
    if (s <= 1) return;
    e.stopImmediatePropagation();
    pan = { sx: e.clientX, sy: e.clientY, x, y };
    cv.setPointerCapture(e.pointerId); apply();
  }, true);
  window.addEventListener('pointermove', (e) => {
    if (!pan) return;
    x = pan.x + e.clientX - pan.sx; y = pan.y + e.clientY - pan.sy; apply();
  });
  window.addEventListener('pointerup', () => { if (pan) { pan = null; apply(); } });
  cv.addEventListener('dblclick', reset);
  $('zoomBtn').addEventListener('click', reset);
  video.addEventListener('loadeddata', reset);
  const badge = document.createElement('span');
  badge.id = 'zoomLevel'; badge.className = 'tag r'; badge.style.cssText = 'top:auto;bottom:12px;pointer-events:auto;cursor:pointer';
  badge.title = 'לחיצה לאיפוס זום'; badge.hidden = true; badge.onclick = reset;
  vp.appendChild(badge);
})();
