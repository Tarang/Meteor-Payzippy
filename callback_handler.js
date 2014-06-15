/* Handles the Callback that comes back from PayZippy */
var connect = Npm.require('connect'),
	Fiber = Npm.require('fibers'),
	url = Npm.require('url'),
	connectHandlers,
	connect;

if (typeof __meteor_bootstrap__.app !== 'undefined') {
	connectHandlers = __meteor_bootstrap__.app;
} else {
	connectHandlers = WebApp.connectHandlers;
}

connectHandlers.use(connect.urlencoded())
connectHandlers.use(connect.json())

var transform_callback_params = function(doc) {
	var data = _(doc).extend({
		transaction_amount: parseInt(doc.transaction_amount),
		is_international: (doc.is_international === "true"),
		transaction_time: new Date(new Date(doc.transaction_time).getTime() - (5.5 * 3600000))
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
		'fraud_details',
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
			    	PayZippy.callback_function(null, transform_callback_params(params), res);
			    }).run();
			}
			else if(params.transaction_status == "FAILED") {
				Fiber(function () {
			    	PayZippy.callback_function(transform_callback_params(params), null, res);
			    }).run();
			}
		}else{
			console.log("Hash is invalid");
		}

		if(!res.headerSent) {
			res.writeHead(200);
			res.end();
		}
    } else next();
});