const EventEmitter = require('events');

class EventService extends EventEmitter {}

const eventService = new EventService();

module.exports = eventService;
