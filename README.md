PayZippy API for Meteor
====
Add the package to your project

```
mrt add payzippy
```

### Usage

First set up the package with the keys given to you by PayZippy

```
PayZippy.setup({
	merchant_id : 'testing',
	merchant_key_id: 'payment',
	secrety_hash_key: '<YOUR HASH_KEY>',
	callback: function(error, result) {
		//Callback function from a payment
	}
});
```

#####Create a URL to make a payment

The following creates a URL to use as an iframe or to redirect to for Rs 150

```
PayZippy.generateChargeUrl("<some transaction id>", "customer_address@email.com", "150")
```
