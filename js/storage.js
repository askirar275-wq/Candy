// storage.js
const Storage = {
  get(key, defaultValue){
    try{
      const v = localStorage.getItem(key);
      return v? JSON.parse(v): defaultValue;
    }catch(e){
      console.error('Storage.get error', e);
      return defaultValue;
    }
  },
  set(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }
    catch(e){ console.error('Storage.set error', e); }
  }
};

// init default progress if not present
if (!Storage.get('candy_progress', null)){
  Storage.set('candy_progress', {unlocked: [1], coins:0});
}
console.log('Loaded: js/storage.js');
