const Card = require('../../Card.js');

class WayOfTheWolf extends Card {
    setupCardAbilities(ability) {
        this.whileAttached({
            effect: ability.effects.addKeyword({ skirmish: 1 })
        });
    }
}

WayOfTheWolf.id = 'way-of-the-wolf'; // This is a guess at what the id might be - please check it!!!

module.exports = WayOfTheWolf;
