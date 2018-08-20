const _ = require('underscore');

const BaseStepWithPipeline = require('../gamesteps/basestepwithpipeline.js');
const ForcedTriggeredAbilityWindow = require('../gamesteps/forcedtriggeredabilitywindow.js');
const SimpleStep = require('../gamesteps/simplestep.js');

class EventWindow extends BaseStepWithPipeline {
    constructor(game, events) {
        super(game);

        this.events = [];
        this.thenAbilities = [];
        _.each(events, event => {
            if(!event.cancelled) {
                this.addEvent(event);
            }
        });

        this.initialise();
    }

    initialise() {
        this.pipeline.initialise([
            new SimpleStep(this.game, () => this.setCurrentEventWindow()),
            new SimpleStep(this.game, () => this.checkEventCondition()),
            new SimpleStep(this.game, () => this.openWindow('interrupt')),
            new SimpleStep(this.game, () => this.preResolutionEffects()),
            new SimpleStep(this.game, () => this.executeHandler()),
            new SimpleStep(this.game, () => this.checkGameState()),
            new SimpleStep(this.game, () => this.checkThenAbilities()),
            new SimpleStep(this.game, () => this.triggerConstantReactions()),
            new SimpleStep(this.game, () => this.openWindow('reaction')),
            new SimpleStep(this.game, () => this.resetCurrentEventWindow())
        ]);
    }

    addEvent(event) {
        event.setWindow(this);
        this.events.push(event);
        return event;
    }

    removeEvent(event) {
        this.events = _.reject(this.events, e => e === event);
        return event;
    }

    addThenAbility(events, ability, context) {
        if(!Array.isArray(events)) {
            events = [events];
        }
        this.thenAbilities.push({ events: events, ability: ability, context: context });
    }

    setCurrentEventWindow() {
        this.previousEventWindow = this.game.currentEventWindow;
        this.game.currentEventWindow = this;
    }

    checkEventCondition() {
        _.each(this.events, event => event.checkCondition());
    }

    openWindow(abilityType) {
        if(_.isEmpty(this.events)) {
            return;
        }

        this.queueStep(new ForcedTriggeredAbilityWindow(this.game, abilityType, this));
    }

    preResolutionEffects() {
        _.each(this.events, event => event.preResolutionEffect());
    }

    executeHandler() {
        this.events = _.sortBy(this.events, 'order');

        _.each(this.events, event => {
            // need to checkCondition here to ensure the event won't fizzle due to another event's resolution (e.g. double honoring an ordinary character with YR etc.)
            event.checkCondition();
            if(!event.cancelled) {
                event.executeHandler();
                this.game.emit(event.name, event);
            }
        });
    }

    checkGameState() {
        this.game.checkGameState(_.any(this.events, event => event.handler), this.events);
    }

    checkThenAbilities() {
        for(const thenAbility of this.thenAbilities) {
            if(thenAbility.events.every(event => !event.cancelled)) {
                let context = thenAbility.ability.createContext(thenAbility.context.player);
                context.preEvents = thenAbility.events;
                context.preEvent = thenAbility.events[0];
                this.game.resolveAbility(context);
            }
        }
    }

    triggerConstantReactions() {
        let reactionWindow = {
            addChoice: context => this.game.resolveAbility(context)
        };
        _.each(this.events, event => this.game.emit(event.name + ':constant', event, reactionWindow));
    }

    resetCurrentEventWindow() {
        if(this.previousEventWindow) {
            this.previousEventWindow.checkEventCondition();
            this.game.currentEventWindow = this.previousEventWindow;
        } else {
            this.game.currentEventWindow = null;
        }
    }
}

module.exports = EventWindow;
