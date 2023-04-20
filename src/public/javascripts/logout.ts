import fetch from 'node-fetch';
import { Response } from 'node-fetch';

function logout() {
  localStorage.clear();
  sessionStorage.clear();
  fetch('/', { method: 'DELETE' })
    .then((res: Response | undefined) => {
      if (res === undefined) {
        // handle undefined response
      } else if (res.ok) {
        location.replace('/');
        location.reload();
      } else {
        console.log('Logout request failed.');
      }
    })
    .catch((err) => {
      // handle error
      console.error(err);
    });
  return true;
}
export default logout;
