const regexes = {
  withUsageTypeRegex: {
    pattern: /\(SPECIAL\) (\d)\/day: any (.*) \((\w*)\) skill$/g,
    func: _handleUsageType
  },
  withSpellRegex: {
    pattern: /\(SPECIAL\) (\d)\/day: any (.*) \[SPELL\]$/g,
    func: _handleSpell
  },
  withClassRegex: {
    pattern: /\(SPECIAL\) (\d)\/day: any (\w*) skill$/g,
    func: _handleAnyClass
  }
};

export function perday(actor, change) {
  const currentItem = change.effect.parent;
  if (currentItem.system.whenRestUsed)
    return;

  let skillsSameType = actor.items.filter(it => it.img == change.effect.parent.img && !it.name.startsWith("_"));
  let changes = [];

  for (const k of Object.values(regexes)) {
    const result = handleRegex(actor, k, currentItem.name, skillsSameType);
    if (!result.matched)
      continue;

    changes = result.changes;
    break;
  }

  if (changes.length) {
    changes.push({ _id: currentItem._id, "system.whenRestUsed": true });
    actor.updateEmbeddedDocuments("Item", changes);
  }
}


function handleRegex(actor, regexInfo, itemName, skills) {
  const matches = [...itemName.matchAll(regexInfo.pattern)][0];
  if (!matches)
    return { matched: false };

  const usagesPerDay = matches[1];

  skills = regexInfo.func(skills, matches);

  return checkUsage(actor, skills, usagesPerDay);
}

function _handleUsageType(skills, matches) {
  const usageType = matches[3] == "R" ? "rest" : "fail";
  return skills.filter(it => it.system.usageType == usageType);
}
function _handleAnyClass(skills, _matches) {
  return skills;
}
function _handleSpell(skills, _matches) {
  return skills.filter(it => it.system.isSpell);
}
function _handleSkill(skills, matches) {
  return skills.filter(it => it.name == matches[2]);
}

function checkUsage(actor, skills, usagesPerDay) {
  let used = skills.filter(it => it.system.whenRestUsed || it.system.whenFailedUsed);
  if (used.length < usagesPerDay)
    return [];

  let changes = [];
  skills.forEach(skill => {
    if (skill.system.usageType == "passive")
      return;
    let property = "system.whenRestUsed";
    if (skill.system.usageType == "fail")
      property = "system.whenFailedUsed";
    changes.push({
      _id: skill._id,
      [property]: true
    });
  });

  return { matched: true, changes: changes };
}