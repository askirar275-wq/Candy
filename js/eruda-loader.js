/* js/eruda-loader.js
   लोड और कंट्रोल Eruda mobile console.
   - DEFAULT_ALWAYS = true -> हमेशा दिखेगा
   - अगर चाहो तो URL param ?debug=1 से भी ऑन कर सकते हो
   - production में बंद करने के लिए DEFAULT_ALWAYS = false कर दो
*/

(function(){
  const DEFAULT_ALWAYS = true; // true -> हमेशा लोड/दिखाए; false -> केवल debug mode या localhost
  const ERUDA_CDN = "https://cdn.jsdelivr.net/npm/eruda";

  // helper: check if url has debug=1
  function isDebugParam(){
    try{
      return /[?&]debug=1\b/.test(location.search);
    }catch(e){ return false; }
  }

  // decide whether to load eruda
  const shouldLoad = DEFAULT_ALWAYS || isDebugParam() || location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if(!shouldLoad) return;

  // create loader UI/button (optional) so user can toggle eruda
  const createToggle = () => {
    try{
      const btn = document.createElement('button');
      btn.id = 'erudaToggleBtn';
      btn.title = 'Toggle Debug Console';
      btn.textContent = '🐞';
      Object.assign(btn.style, {
        position: 'fixed',
        right: '12px',
        bottom: '88px',
        zIndex: 999999,
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        border: 'none',
        background: 'linear-gradient(180deg,#ff8fc1,#ff6fb3)',
        color: '#fff',
        fontSize: '20px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
      document.body.appendChild(btn);
      return btn;
    }catch(e){ return null; }
  };

  // load eruda script
  function loadEruda(onready){
    if(window.eruda){ try{ onready && onready(); } catch(e){}; return; }
    const s = document.createElement('script');
    s.src = ERUDA_CDN;
    s.async = true;
    s.onload = function(){
      try{
        // init with some config
        window.eruda && window.eruda.init({
          tool: ['console','elements','network','resources','sources','errors','memory'],
          defaults: {
            displaySize: 60 // console height in vh (you can change)
          }
        });
        // show console by default
        try{ window.eruda && window.eruda.show(); }catch(e){}
        onready && onready();
      }catch(e){ console.warn('eruda init failed', e); }
    };
    s.onerror = function(err){
      console.warn('Failed to load eruda from CDN', err);
    };
    document.head.appendChild(s);
  }

  // Try to create toggle button and wire events
  const toggleBtn = (document.readyState === 'loading')
    ? (document.addEventListener('DOMContentLoaded', ()=>{}), null)
    : createToggle();

  // If toggle created later (because DOMContentLoaded), create after DOM ready
  function readyCreateToggleAndLoad(){
    const btn = document.getElementById('erudaToggleBtn') || createToggle();
    if(btn){
      btn.addEventListener('click', ()=>{
        if(!window.eruda){
          loadEruda(()=> {
            // after load, toggle
            try{ window.eruda && window.eruda.show(); }catch(e){}
          });
        } else {
          // toggle show/hide
          try{
            const er = window.eruda;
            // eruda has show() and hide(); check visibility by checking DOM
            const panel = document.querySelector('.eruda');
            if(panel && panel.style.display !== 'none') er.hide();
            else er.show();
          }catch(err){ console.warn(err); }
        }
      });
    } else {
      // no button case -> just load immediately
      loadEruda();
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', readyCreateToggleAndLoad);
  } else {
    readyCreateToggleAndLoad();
  }

})();
