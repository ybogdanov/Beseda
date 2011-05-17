Beseda.Transport.LongPolling = function() {
	Beseda.Transport.LongPolling._super.constructor.call(this);

	this._typeSuffix = 'longPolling';

	this._connectionRequest = null;
	this._pollRequest = null;
	this._sendRequest = null;

	this._sendSuffix = '';

	this._initRequests();

	var self = this;

	this.__handleConnectionClosure = function(data) {
		self._handleConnection(data);
	};

	this.__handleMessageClosure = function(data) {
		self._handleMessage(data);
	};

	this.__handleErrorClosure = function() {
		self._emitter.emit('error');
	};

	this._connectionRequest.addListener('ready', this.__handleConnectionClosure);
	this._pollRequest.addListener('ready', this.__handleMessageClosure);
	this._connectionRequest.addListener('error', this.__handleErrorClosure);
	this._pollRequest.addListener('error', this.__handleErrorClosure);
};

Beseda.utils.inherits(Beseda.Transport.LongPolling, Beseda.Transport);

Beseda.Transport.LongPolling.isAvailable = function(options) {
	return false;//document.location.hostname === options.host;
}

Beseda.Transport.LongPolling.prototype._initRequests = function() {
	this._connectionRequest = new Beseda.Transport.LongPolling.Request('GET');
	this._pollRequest       = new Beseda.Transport.LongPolling.Request('GET');
	this._sendRequest       = new Beseda.Transport.LongPolling.Request('POST');
};

Beseda.Transport.LongPolling.prototype.connect = function(host, port, ssl) {
	//if (!this._url) {
		var protocol = ssl ? 'https' : 'http';

		this._url = protocol + '://' + host + ':' + port + "/beseda/io";

		var connectUrl = this._url + "/" + this._typeSuffix;

		this._connectionRequest.send(connectUrl);
	//xs}
};

Beseda.Transport.LongPolling.prototype._handleConnection = function(message) {
	var data = this._parseMessage(message);
	
	var id = data.connectionId;

	if (id) { 
		this._sendRequest.url = 
		this._pollRequest.url =
			this._url + "/" + this._typeSuffix + "/" + id;

		this._sendRequest.url += this._sendSuffix;

		Beseda.Transport.LongPolling._super._handleConnection.call(this, id);

		this.__poll();
	}
};

Beseda.Transport.LongPolling.prototype.__poll = function() {
	if (this._connectionID) {
		this._pollRequest.send();
	}
};

Beseda.Transport.LongPolling.prototype._parseMessage = function(message) {
	return JSON.parse(message);
};

Beseda.Transport.LongPolling.prototype._handleMessage = function(message) {
	var data = this._parseMessage(message);

	Beseda.Transport.LongPolling._super._handleMessage.call(this, data);

	this.__poll();
};

Beseda.Transport.LongPolling.prototype.send = function(data) {
	if (this._connectionID) {
		this._sendRequest.data = data;
		this._sendRequest.send();
	} else {
		this._enqueue(data);
	}
};

Beseda.Transport.LongPolling.Request = function(method) {
	Beseda.Transport.LongPolling.Request._super.constructor.call(this);
	
	this.url = null;
	this.method = method || 'GET';
	this.data = null;
};

Beseda.utils.inherits(Beseda.Transport.LongPolling.Request, Beseda.EventEmitter);

Beseda.Transport.LongPolling.Request.prototype.__requestStateHandler = function(request) {
	if (request.readyState === 4) {
		if (request.status === 200) {
			this.emit('ready', request.responseText);
		} else {
			this.emit('error');
		}
		
		request.onreadystatechange = null;
		request.abort();
	}
};

Beseda.Transport.LongPolling.Request.prototype.send = function(url) {
	if (url) {
		this.url = url;
	}

	var requestURL = this.url;

	if (request != null)
		request.abort();

	var request = !!+'\v1' ? new XMLHttpRequest() :
							 new ActiveXObject("Microsoft.XMLHTTP");

	var self = this;
	request.onreadystatechange = function() {
		self.__requestStateHandler(request);
	}

	if (this.method === 'GET' && this.data) {
		requestURL += 
			(requestURL.indexOf('?') === -1 ? '?' : '&') + this.data;
	}

	request.open(this.method, encodeURI(requestURL), true);

	var sendData = null;
	if (this.method === 'POST') {
		sendData = this.data;
		request.setRequestHeader
			('Content-Type', 'application/x-www-form-urlencoded');
	}

	request.send(sendData);
};
