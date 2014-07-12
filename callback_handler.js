/* Handles the Callback that comes back from PayZippy */
var connect = Npm.require('connect'),
	Fiber = Npm.require('fibers'),
	bodyParser = Npm.require('body-parser'),
	url = Npm.require('url'),
	connectHandlers,
	connect;

if (typeof __meteor_bootstrap__.app !== 'undefined') {
	connectHandlers = __meteor_bootstrap__.app;
} else {
	connectHandlers = WebApp.connectHandlers;
}

connectHandlers.use(bodyParser.urlencoded({extended: true}));
connectHandlers.use(bodyParser.json());

var transform_callback_params = function(doc) {
	var data = _(doc).extend({
		transaction_amount: parseInt(doc.transaction_amount),
		is_international: (doc.is_international === "true"),
		transaction_time: new Date(new Date(doc.transaction_time).getTime() - ((5.5+(new Date().getTimezoneOffset() / 60)) * 3600000) ),
		paid: (doc.transaction_status == "SUCCESS"),
		pending: (doc.transaction_status == "PENDING"),
		failed: (doc.transaction_status == "FAILED")
	});

	//Time is returned in GMT
	return _(data).pick([
		'transaction_time',
		'transaction_auth_state',
		'transaction_response_code',
		'transaction_response_message',
		'transaction_status',
		'payment_instrument',
		'payzippy_transaction_id',
		'fraud_action',
		'merchant_transaction_id',
		'transaction_amount',
		'is_international',
		'bank_name',
		'fraud_details',
		'paid',
		'failed',
		'pending',
		'payment_method']);
}

connectHandlers.use(function(req, res, next) {
	if(url.parse(req.url).pathname === '/api/payzippy/payments') {
		var method = (req.method || "").toLowerCase(),
			hash,
			params;

		if(method == "get") {
			hash = req.query.hash;
			params = req.query;
		}else if(method == "post") {
			hash = req.body.hash;
			params = req.body;
		}

		if(PayZippy.getParamHash(params) === hash ) {

			if(params.transaction_status == "PENDING" || params.transaction_status == "SUCCESS") {
				Fiber(function () {
			    	PayZippy.callback_function(null, transform_callback_params(params), res, req);

			    	if(!res.headerSent) {
						res.writeHead(200);
						res.end();
					}
			    }).run();
			}
			else if(params.transaction_status == "FAILED") {
				Fiber(function () {
			    	var result = transform_callback_params(params);

			    	PayZippy.callback_function({
			    		reason: result.transaction_response_message,
			    		code: result.transaction_response_code,
			    		merchant_transaction_id: result.merchant_transaction_id,
			    		fraud_details: result.fraud_details,
			    		transaction_time: result.transaction_time,
			    		id: result.payzippy_transaction_id,
			    		is_international: result.is_international,
			    		payment_instrument: result.payment_instrument,
			    		bank_name: result.bank_name
			    	}, null, res, req);

			    	if(!res.headerSent) {
						res.writeHead(200);
						res.end();
					}
			    }).run();
			}
		}else{
			console.log("PayZippy: Ignore due to invalid hash");
			res.writeHead(200);
			res.end();
		}

    } else next();
});