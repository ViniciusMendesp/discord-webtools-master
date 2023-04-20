import { LocalStorage } from 'node-localstorage';

const localStorage = new LocalStorage('./server-localstorage');

interface Item {
  [key: string]: any;
}

function setItem(state: string, kvp: Record<string, any>): void {
  const current = localStorage.getItem(state);
  const new_data = {
    ...(current && JSON.parse(current)),
    ...kvp,
  };
  localStorage.setItem(state, JSON.stringify(new_data));
}

function getItem(state: string, key: string): any {
  if (!state) {
    return null;
  }
  const current = localStorage.getItem(state);
  if (typeof current === 'string') {
    const parsed = JSON.parse(current);
    return parsed[key];
  }
  return null;
}

function remove(state: string): void {
  localStorage.removeItem(state);
}

export { setItem, getItem, remove };
