// js/storage.js
(function(){
  var store = {
    get: function(key, def){
      try {
        var v = window.localStorage.getItem(key);
        if(!v) return def || null;
        return JSON.parse(v);
      } catch(e){ return def || null; }
    },
    set: function(key, val){
      try { window.localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
    }
  };
  window.Storage = store;

  // initialize default progress if not present
  document.addEventListener('DOMContentLoaded', function(){
    var prog = Storage.get('candy_progress');
    if(!prog){
      Storage.set('candy_progress', { unlocked: [1], coins: 0 });
      console.log('Loaded: js/storage.js (init)');
    } else {
      console.log('Loaded: js/storage.js');
    }
  });
})();
