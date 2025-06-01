const MAX_NEW_NONMATCH_PER_DAY = 10; // Par exemple

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function countNewNonMatchToday(user, today = new Date()) {
  return user.nonMatchContactsLog.filter(entry =>
    isSameDay(entry.date, today)
  ).length;
}

function hasContactedToday(user, targetUserId, today = new Date()) {
  return user.nonMatchContactsLog.some(entry =>
    entry.userId.equals(targetUserId) && isSameDay(entry.date, today)
  );
}

module.exports = {
  MAX_NEW_NONMATCH_PER_DAY,
  countNewNonMatchToday,
  hasContactedToday
};
