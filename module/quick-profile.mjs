/*
    Show panel with actor information relevant in combat.

    Inspired and heavily based on the Action Pack FVTT module by Tero Parvinen
    https://github.com/teroparvinen/foundry-action-pack

    Actor Profile displayed in Quick Profile Tray.
 */

const TRAY_ID = 'quick-profile';
const TRAY_SELECTOR = `#${TRAY_ID}`;

const CONFIG_TRAY_MODE = 'tray-display';
const CONFIG_TRAY_SIZE = 'tray-size';

const CLASS_OPEN = 'is-open';
const CLASS_ALWAYS_ON = 'always-on';

const HANDLED_TYPES = ['character', 'npc', 'creature'];

const TEMPLATE_DIR = 'modules/zweihammer-extras/module/templates/quick-profile';
const MAIN_PROFILE_TEMPLATE = `${TEMPLATE_DIR}/quick-profile.hbs`;
const ACTOR_PROFILE_TEMPLATE = `${TEMPLATE_DIR}/quick-profile-actor.hbs`;

// [ "base", "ancestry", "armor", "condition", "disease", "disorder", "drawback", "injury", "profession",
// "quality", "ritual", "skill", "spell", "taint", "talent", "trait", "trapping", "uniqueAdvance", "weapon" ]
const TRAIT_TYPES = [ "drawback", "taint", "trait", "disease", "disorder", "injury"];


function _tr(stringId) {
    return game.i18n.localize(stringId);
}

function zhTr(stringId) {
    return _tr(`zweihammer.${stringId}`);
}

export class QuickProfileTray {
    constructor(moduleName) {
        this.config = new QuickProfileTrayConfig(moduleName, this);
        this.profile = new QuickProfile();
    }

    init() {
        const trayHtml = `<div id="${TRAY_ID}"></div>`;
        $('#interface').prepend(trayHtml);
        // if (this.isTrayAlwaysOpen()) {
        //     this.openTray({alwaysOn: true});
        // }
        this.updateTrayState();
    }

    openTray({alwaysOn = false}) {
        $(TRAY_SELECTOR).addClass(CLASS_OPEN);
        if (alwaysOn) {
            $(TRAY_SELECTOR).addClass(CLASS_ALWAYS_ON);
        }
        else {
            $(TRAY_SELECTOR).removeClass(CLASS_ALWAYS_ON);
        }
    }

    toggleTray() {
        if (!this.config.alwaysOn) {
            $(TRAY_SELECTOR).toggleClass(CLASS_OPEN);
        }
    }

    updateTrayState() {
        if (this.config.autoHide) {
            if (this.getActiveActors().length) {
                $(TRAY_SELECTOR).addClass(CLASS_OPEN);
            } else {
                $(TRAY_SELECTOR).removeClass(CLASS_OPEN);
            }
        }

        if (this.config.alwaysOn) {
            $(TRAY_SELECTOR).addClass([CLASS_OPEN, CLASS_ALWAYS_ON]);
        } else {
            $(TRAY_SELECTOR).removeClass(CLASS_ALWAYS_ON);
        }

        // updateCombatStatus();
        this.updateTray();
    }

    async updateTray() {
        const container = $(TRAY_SELECTOR);
        container.html('');
        container.attr('style', `--quick-profile-width: ${this.config.traySize}px;`);

        const actors = this.getActiveActors().map(actor => {
            return this.profile.renderProfile(actor);
        });

        const data = {
            profiles: await Promise.all(actors),
        };
        const content = await renderTemplate(MAIN_PROFILE_TEMPLATE, data);
        container.html(content);
    }

    async refresh(actor) {
        if (this.getActiveActors().includes(actor)) {
            console.log('refreshing tray');
            this.updateTray();
        }
    }

    getActiveActors() {
        const controlled = canvas.tokens.controlled.filter(
            t => HANDLED_TYPES.includes(t.actor?.type)
        );
        if (controlled.length) {
            return controlled.map(token => token.actor);
        }
        if (game.user.character && this.config.assumeDefaultCharacter) {
            return [game.user.character];
        }
        return [];
    }
}

class QuickProfile {
    static get defaultOptions() {
        const options = {
            template: ACTOR_PROFILE_TEMPLATE,
        }
        return options;
    }

    constructor(options={}) {
        this.options = this.constructor.defaultOptions;
    }

    get template() {
        return this.options.template;
    }

    async getData(actor, options={}) {
        const data = {
            options,
            actor,
            attributes: this._getActorAttributes(actor),
            skills: this._getActorSkills(actor),
            attacks: this._getActorAttacks(actor),
            traits: this._getActorTraits(actor, TRAIT_TYPES),
        }
        return data;
    }

    async renderProfile(actor) {
        const data = await this.getData(actor, this.options);
        const html = renderTemplate(this.template, data);
        return html;
    }

    _getActorAttributes(actor) {
        const stats = actor.system.stats;
        const primary = Object.entries(stats.primaryAttributes).map(([name, data]) => {
            return [name, {abbrev: zhTr(`profile.abbrev.${name}`), value: data.value, bonus: data.bonus} ];
        });
        let mov = 0;
        const movement = stats.secondaryAttributes.movement;
        if (movement.current === undefined) {
            mov = `${movement.value}`; // ??? /${movement.fly}`;
        } else {
            mov = `${movement.current}`;
        }
        const initiative = stats.secondaryAttributes.initiative;
        const init = initiative.current ?? initiative.value;
        const dth = stats.secondaryAttributes.damageThreshold.value;
        const pth = stats.secondaryAttributes.perilThreshold.value;
        const secondary = {
            initiative: {abbrev: zhTr(`profile.abbrev.initiative`), value: init},
            movement: {abbrev: zhTr(`profile.abbrev.movement`), value: mov},
            dth: {abbrev: zhTr(`profile.abbrev.dth`), value: `${dth}<br/>(${dth+6}/${dth+12}/${dth+18})`},
            pth: {abbrev: zhTr(`profile.abbrev.pth`), value: `${pth}<br/>(${pth+6}/${pth+12}/${pth+18})`},
            parry: {abbrev: zhTr(`profile.abbrev.parry`), value: stats.secondaryAttributes.parry.value},
            dodge: {abbrev: zhTr(`profile.abbrev.dodge`), value: stats.secondaryAttributes.dodge.value},
            risk: {abbrev: zhTr(`profile.abbrev.riskfactor`), value: ""}
        };

        return { primary: Object.fromEntries(primary), secondary };
    }

    _getActorSkills(actor) {
        const skills = actor.itemTypes.skill
            .map(skill => {
                return {
                    name: skill.name,
                    attrAbbrev: skill.system.associatedPrimaryAttribute[0],
                    bonus: skill.system.bonus,
                    flipToFail: skill.system.isFlipToFail,
                    baseChance: skillBaseChance(actor, skill)
                };
            })
            .toSorted((a, b) => a.name.localeCompare(b.name))
            .filter(skill => skill.bonus > 0)
            ;
        return skills;
    }

    _getActorAttacks(actor) {
        const attacks = actor.itemTypes.weapon
            .filter(weapon => (actor.type != 'character') || (weapon.system.equipped))
            .map(weapon => ({
                name: weapon.name,
                skill: weapon.system.associatedSkill,
                chance: weaponBaseChance(actor, weapon),
                flipToFail: actorSkillByName(actor, weapon.system.associatedSkill).system.isFlipToFail,
                distance: weapon.system.distance,
                load: weapon.system.load,
                damageFormula: weapon.system.damage.formula,
                damage: weaponDamage(actor, weapon),
                qualities: weapon.system.qualities.value
            }))
            .toSorted((a, b) => a.name.localeCompare(b.name));
        return attacks;
    }

    _getActorTraits(actor, types) {
        const talents = actor.itemTypes.talent
            .filter(t => actorHasTalent(actor, t));
        const otherTraits = actor.items
            .filter(t => types.includes(t.type));
        const allTraits = [...talents, ...otherTraits];
        return allTraits.map(t => ({
                name: t.name,
                effect: t.system.rules.effect['@en'],
            }))
            .toSorted((a, b) => a.name.localeCompare(b.name))
        ;
    }
}

function actorHasTalent(actor, talent) {
    const professions = actor.itemTypes.profession;
    const isManualSource = talent.flags.zweihander?.source?.label ? false : true;
    const hasTalent = isManualSource || professions.some(
        p => p.system.talents.some(
            t => t.linkedId === talent._id && t.purchased
        )
    );
    return hasTalent;
}

function actorSkillByName(actor, skillName) {
    return actor.itemTypes.skill.find(s => s.name === skillName);
}

function skillBaseChance(actor, skill) {
    const attr = skill.system.associatedPrimaryAttribute;
    const attrValue = actor.system.stats.primaryAttributes[attr.toLowerCase()].value;
    const rankBonus = skill.system.bonus;
    const bonuses = rankBonus;
    const baseChance = attrValue + Math.max(-30, Math.min(30, bonuses));
    return baseChance;
}

function weaponBaseChance(actor, weapon) {
    const skillName = weapon.system.associatedSkill;
    const skill = actorSkillByName(actor, skillName);
    return skillBaseChance(actor, skill);
}

function weaponDamage(actor, weapon) {
    let formula = weapon.system.damage.formula; //.replace('\[#\]', '@fury');
    let terms = Roll.parse(formula);
    let simplified = Roll.getFormula(terms.slice(0, terms.length-3));
    return simplified;
}

class QuickProfileTrayConfig {
    constructor(ns, tray) {
        this.ns = ns;
        registerQuickProfileTraySettings(ns, tray);
        registerQuickProfileTrayKeybindings(ns, tray);
    }

    get autoHide() {
        const mode = game.settings.get(this.ns, CONFIG_TRAY_MODE);
        return mode === 'selected' || (mode === 'auto' && game.user.isGM);
    }

    get alwaysOn() {
        const mode = game.settings.get(this.ns, CONFIG_TRAY_MODE);
        return mode === 'always';
    }

    get assumeDefaultCharacter() {
        return true;
    }

    get traySize() {
        return game.settings.get(this.ns, CONFIG_TRAY_SIZE);
    }
}

async function onControlToken(token, controlled) {
    game.profileTray.updateTrayState();
}

async function onActorUpdate(actor) {
    console.log('onActorUpdate', actor);
    game.profileTray.refresh(actor);
}

async function onItemChange(item) {
    console.log('onItemChange', item);
    game.profileTray.refresh(item.actor);
}

Hooks.on('controlToken', onControlToken);
Hooks.on('updateActor', onActorUpdate);
Hooks.on('createItem', onItemChange);
Hooks.on('updateItem', onItemChange);
Hooks.on('deleteItem', onItemChange);
// other hooks: updateCombat, createCombat, updateCombatant, deleteCombat

const registerQuickProfileTraySettings = (ns, tray) => {
    console.log('zweihammer | register quick profile tray settings');
    game.settings.register(ns, CONFIG_TRAY_MODE, {
        name: 'Tray display mode',
        scope: 'client',
        config: true,
        // default: 'auto',
        default: 'always',
        choices: {
            auto: 'Automatic',
            toggle: 'Toggle',
            selected: 'When token selected',
            always: 'Always show the tray'
        },
        type: String,
        onChange: () => {
            ui.controls.initialize();
            tray.updateTrayState();
        }
    });
    game.settings.register(ns, CONFIG_TRAY_SIZE, {
        name: 'Quick profile tray size',
        scope: 'client',
        config: true,
        type: Number,
        range: {
            min: 200,
            max: 500,
            step: 50
        },
        default: 300,
    });
};

const registerQuickProfileTrayKeybindings = (ns, tray) => {
    console.log('zweihammer | register quick profile tray keybindings');
    game.keybindings.register(ns, 'toggle-tray', {
        name: 'Toggle quick profile tray',
        editable: [
            { key: 'KeyE', modifiers: [] }
        ],
        onDown: (ctx) => {
            tray.toggleTray();
        }
    });
};

Handlebars.registerHelper('json', (obj) => {
    return JSON.stringify(obj, null, 2);
});