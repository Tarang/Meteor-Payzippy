var hash_sha_256 = function(str) {
	var crypto = Npm.require('crypto');
	return crypto.createHash('sha256').update(str).digest('hex');
}

var sort_object = function(map) {
    var keys = _.sortBy(_.keys(map), function(a) { return a; });
    var newmap = {};
    _.each(keys, function(k) {
        newmap[k] = map[k];
    });
    return newmap;
}

var encodeParams = function(params) {
  var buf = [];
  _.each(params, function(value, key) {
    if (buf.length)
      buf.push('&');
    buf.push(encodeString(key), '=', encodeString(value));
  });
  return buf.join('').replace(/%20/g, '+');
};

var encodeString = function(str) {
  return encodeURIComponent(str).replace(/[!'()]/g, escape).replace(/\*/g, "%2A");
};

PayZippy = {
	CHARGING_URL: 		"https://www.payzippy.com/payment/api/charging/v1",
	REFUND_URL:   		"https://www.payzippy.com/payment/api/refund/v1",
	QUERY_URL:    		"https://www.payzippy.com/payment/api/query/v1",
	MERCHANT_ID:  		"test",
	VERSION:			"0.8.6",
	MERCHANT_KEY_ID:	"payment",
	SECRET_HASH_KEY:	"<SECRET_HASH_KEY>",
	CURRENCY:		"INR",
	TIMEZONE_OFFSET:	"",
	UI_MODE:		"IFRAME",
	CALLBACK_URL: 		"https://localhost:3000/testing",
	isSetup:		false,
	setup: function(params) {
		
		var callback_url = Meteor.absoluteUrl('api/payzippy/payments',{secure: true});

		_.extend(this, {
			MERCHANT_ID: params.merchant_id,
			MERCHANT_KEY_ID: params.merchant_key_id,
			SECRET_HASH_KEY: params.secrety_hash_key,
			CALLBACK_URL: callback_url,
			callback_function: params.callback,
			isSetup: true
		});
	},

	getAmount: function(amount) {
		return parseInt(amount*100);
	},

	getParamHash: function(params) {

		delete params.hash;
		var sorted_by_key = sort_object(params),
			self = this;

		var token = _.values(sorted_by_key).concat(self.SECRET_HASH_KEY).join("|");

		return hash_sha_256(token);
	},

	generateChargeUrl: function(transaction_id, buyer_email, amount, override) {

		var self = this;

		if(!self.isSetup) throw new Meteor.Error(1000, "PayZippy module is not setup. Please call PayZippy.setup first");

		var params = _.extend({
			merchant_id: self.MERCHANT_ID,
			buyer_email_address: buyer_email,
			merchant_transaction_id: transaction_id,
			transaction_type: "SALE",
			ui_mode: self.UI_MODE,
			//source:"MOBILE",
			transaction_amount: self.getAmount(amount),
			payment_method: "DEBIT",
			//bank_name: "HDFC",
			currency: self.CURRENCY,
			hash_method: "SHA256",
			merchant_key_id: self.MERCHANT_KEY_ID,
			amount: self.getAmount(amount),
			callback_url: self.CALLBACK_URL
		}, override || {});



		var hash = self.getParamHash(params);

		params.hash = hash;

		var query_string = encodeParams(params);

		return [self.CHARGING_URL, "?", query_string].join('');

	},

	getPaymentstatus: function(transaction_id, override) {
		
		var self = this;

		if(!self.isSetup) throw new Meteor.Error(1000, "PayZippy module is not setup. Please call PayZippy.setup first");

		var params = _.extend({
			merchant_id: self.MERCHANT_ID,
			hash_method: "SHA256",
			merchant_key_id: self.MERCHANT_KEY_ID,
			payzippy_transaction_id: transaction_id,
			callback_url: self.CALLBACK_URL
		}, override || {});

		params = _.extend(params, {
			hash: self.getParamHash(params)
		});

		var response = HTTP.get(self.QUERY_URL, {
			params: params
		});

		if(response.data.error_code) throw new Meteor.Error(404, response.data.error_message, response.data.error_code);

		return response.data.data[0];
	},

	processRefund: function(transaction_id, amount, reason, refunded_by, override) {
		var self = this;

		if(!self.isSetup) throw new Meteor.Error(1000, "PayZippy module is not setup. Please call PayZippy.setup first");

		var params = _.extend({
			merchant_id: self.MERCHANT_ID,
			hash_method: "SHA256",
			refund_amount: amount,
			refund_reason: reason,
			refunded_by: refunded_by,
			merchant_key_id: self.MERCHANT_KEY_ID,
			payzippy_sale_transaction_id: transaction_id,
		}, override || {});

		params = _.extend(params, {
			hash: self.getParamHash(params)
		});

		var response = HTTP.post(self.REFUND_URL, {
			params: params
		});

		var response_data = response.data.data;

		if(!response_data && response.data.error_message) {
			throw new Meteor.Error(500, response.data.error_message, response.data.error_code);
		}

		if(response_data.refund_response_code in self.errorCodes.refund)
			throw new Meteor.Error(500, self.errorCodes.refund[response_data.refund_response_code], response_data.refund_response_code);
		else if(response_data.error_message) {
			throw new Meteor.Error(500, response_data.error_message, response_data.error_code);
		}

		if([
			"SUCCESS",
			"PENDING",
			"INITIATED",
		].indexOf(response_data.refund_status) >= 0)
			return true;

		if(response.data.error_code) throw new Meteor.Error(500, response.data.error_message, response.data.error_code);

		throw new Meteor.Error(500, "Unknown Error");
	},

	callback_function:	function() {

	}
}
