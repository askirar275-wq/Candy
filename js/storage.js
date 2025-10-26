const Storage = {
  get(key, defaultValue){
    try{
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : defaultValue;
    }catch(e){return defaultValue}
  },
  set(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
  }
};

// default unlocked levels
if(!Storage.get('unlockedLevels')) Storage.set('unlockedLevels', [1]);
