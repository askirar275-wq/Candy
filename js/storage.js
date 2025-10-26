const Storage = {
  get(key, defaultValue){
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : defaultValue;
    } catch(e){ return defaultValue; }
  },
  set(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }
};
