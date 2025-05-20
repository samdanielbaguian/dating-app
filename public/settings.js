document.addEventListener('DOMContentLoaded', () => {
  const settingsForm = document.getElementById('settingsForm');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const twoFactorCheckbox = document.getElementById('twoFactorAuth');
  const twoFactorInfo = document.getElementById('twoFactorInfo');
  const verifyCodeBtn = document.getElementById('verifyCode');

  // Envoi du formulaire de paramètres
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      document.getElementById('settingsMessage').textContent = data.message || 'Mise à jour réussie';
    } catch (err) {
      console.error(err);
    }
  });

  // Changement de mot de passe
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmNewPassword').value;

    if (newPass !== confirm) {
      document.getElementById('passwordMessage').textContent = "Les mots de passe ne correspondent pas.";
      return;
    }

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
      });
      const data = await res.json();
      document.getElementById('passwordMessage').textContent = data.message;
    } catch (err) {
      console.error(err);
    }
  });

  // 2FA
  twoFactorCheckbox.addEventListener('change', async () => {
    if (twoFactorCheckbox.checked) {
      twoFactorInfo.style.display = 'block';
      await fetch('/api/user/send-2fa-code', { method: 'POST' });
    } else {
      twoFactorInfo.style.display = 'none';
    }
  });

  verifyCodeBtn.addEventListener('click', async () => {
    const code = document.getElementById('twoFactorCode').value;
    try {
      const res = await fetch('/api/user/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      console.error(err);
    }
  });

  // Déconnexion
  document.getElementById('logout').addEventListener('click', () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => location.href = '/login.html');
  });

  // Suppression de compte
  document.getElementById('deleteAccount').addEventListener('click', () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ?')) {
      fetch('/api/user/delete', { method: 'DELETE' }).then(() => location.href = '/goodbye.html');
    }
  });
});
