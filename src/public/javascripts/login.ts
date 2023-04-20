/* eslint-env browser */
function generateRandomString(): string {
  let randomString = '';
  const randomNumber = Math.floor(Math.random() * 10);

  for (let i = 0; i < 20 + randomNumber; i++) {
    randomString += String.fromCharCode(33 + Math.floor(Math.random() * 94));
  }

  return randomString;
}

function verifyUser(object: any): boolean {
  if (object && object.id && object.username && object.discriminator) {
    return true;
  }
  return false;
}

function checkUserData(userDataStr: string | null): boolean {
  try {
    const userdata = JSON.parse(userDataStr!);
    if (!userdata) {
      return false;
    }
    if (!verifyUser(userdata)) {
      return false;
    }
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
      logoutButton.style.display = 'block';
    }
    const info = document.getElementById('info');
    if (info) {
      info.innerText += ` ${userdata.username}`;
    }
    const avatar = document.getElementById('avatar');
    if (avatar) {
      if (userdata.avatar) {
        const ext = userdata.avatar.startsWith('a_') ? 'gif' : 'png';
        avatar.style.backgroundImage = `url("//cdn.discordapp.com/avatars/${userdata.id}/${userdata.avatar}.${ext}?size=128")`;
      } else {
        const d_id = userdata.discriminator % 5;
        avatar.style.backgroundImage = `url("//cdn.discordapp.com/embed/avatars/${d_id}.png?size=128")`;
      }
    }
    return true;
  } catch {
    return false;
  }
}

window.onload = () => {
  const userDataStr = localStorage.getItem('userdata');
  const logged_in = checkUserData(userDataStr);
  if (logged_in) {
    return;
  }

  let randomString = localStorage.getItem('oauth-state');
  if (!randomString) {
    randomString = generateRandomString();
    localStorage.setItem('oauth-state', randomString);
  }

  const loginLink = document.getElementById('login');
  if (loginLink && loginLink instanceof HTMLAnchorElement) {
    loginLink.href += `&state=${btoa(randomString)}`;
    loginLink.style.display = 'block';
  }
  const logoutButton = document.getElementById('logout');
  if (logoutButton) {
    logoutButton.style.display = 'none';
  }
};
