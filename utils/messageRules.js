// utils/messageRules.js
// Règles de gestion de la messagerie avancée pour le quota premium et la gestion des contacts non-match

const MAX_NEW_NONMATCH_PER_DAY = 10; // Modifie cette valeur selon ton offre premium

/**
 * Vérifie si deux dates sont le même jour (UTC)
 */
function isSameDay(d1, d2) {
  return d1.getUTCFullYear() === d2.getUTCFullYear() &&
         d1.getUTCMonth() === d2.getUTCMonth() &&
         d1.getUTCDate() === d2.getUTCDate();
}

/**
 * Nombre de nouveaux contacts non-match approchés aujourd'hui
 * @param {User} user - l'utilisateur qui envoie le message
 * @param {Date} [today] - la date du jour (défaut = maintenant)
 * @returns {number}
 */
function countNewNonMatchToday(user, today = new Date()) {
  if (!user.nonMatchContactsLog) return 0;
  return user.nonMatchContactsLog.filter(entry =>
    isSameDay(entry.date, today)
  ).length;
}

/**
 * Vérifie si l'utilisateur a déjà contacté ce destinataire aujourd'hui (hors match)
 * @param {User} user - l'utilisateur qui envoie
 * @param {ObjectId} targetUserId - id du destinataire
 * @param {Date} [today] - la date du jour
 * @returns {boolean}
 */
function hasContactedToday(user, targetUserId, today = new Date()) {
  if (!user.nonMatchContactsLog) return false;
  return user.nonMatchContactsLog.some(entry =>
    entry.userId.equals(targetUserId) && isSameDay(entry.date, today)
  );
}

module.exports = {
  MAX_NEW_NONMATCH_PER_DAY,
  countNewNonMatchToday,
  hasContactedToday
};
