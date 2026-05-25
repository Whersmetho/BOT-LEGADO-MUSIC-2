function canControl(member, queue, commandName = 'este comando') {
  if (!queue) {
    return { allowed: true };
  }

  const ownerId = queue.ownerId;

  if (!ownerId) {
    return { allowed: true };
  }

  if (member.id === ownerId) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `❌ Solo la persona que inició el bot puede usar \`${commandName}\`.`
  };
}

module.exports = {
  canControl
};
