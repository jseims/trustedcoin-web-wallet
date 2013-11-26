var tc_crypto = tc_crypto || {};

tc_crypto.generate_mnemonic = function() {
    var pk = new Array(32);
    rng_get_bytes(pk);
    var seed = Crypto.util.bytesToHex(pk.slice(0,16));
    // nb! electrum doesn't handle trailing zeros very well
    // and we want to stay compatible.
    if (seed.charAt(0) == '0') seed = seed.substr(1);
    return mn_encode(seed);
};

tc_crypto.mnemoic_to_key = function(mnemonic, keyReadyCallback, keyProgressCallback) {
    var seed = mn_decode(mnemonic);
    
    Electrum.init(seed, keyProgressCallback, function(key) {
        Electrum.gen(1, function(r) {
            var key = new Bitcoin.ECKey(r[1]);
            key.setCompressed(true);
            keyReadyCallback({
                key: key,
                address: key.getBitcoinAddress().toString(),
                privateKey: key.getExportedPrivateKey(),
                publicKey: Crypto.util.bytesToHex(key.getPub())
            });
        });
    });
};

tc_crypto.sign_transaction = function(private_key, raw_transaction) {
	return "<signed transaction>";
};

tc_crypto.create_cosigner = function(primary_key, secondary_key, policy, success_callback, error_callback) {
	jQuery.ajax({
			  url: "https://api.trustedcoin.com/1/cosigner",
			  type: "POST",
			  data: JSON.stringify({"primary_key": primary_key, "secondary_key": secondary_key, "policy" : policy}),
			  dataType: "json",
			  contentType : 'application/json',		  
			  beforeSend: function(x) {
				if (x && x.overrideMimeType) {
				  x.overrideMimeType("application/j-son;charset=UTF-8");
				}
			  },
			  success: success_callback,
			  error: function(data) {
				var errorObj = JSON.parse(data.responseText);
				error_callback(errorObj.message);
			  }
	});
};

tc_crypto.get_cosigner = function(address, success_callback, error_callback) {
	jQuery.ajax({
			  url: "https://api.trustedcoin.com/1/cosigner/" + address,
			  type: "GET",
			  dataType: "json",
			  contentType : 'application/json',		  
			  beforeSend: function(x) {
				if (x && x.overrideMimeType) {
				  x.overrideMimeType("application/j-son;charset=UTF-8");
				}
			  },
			  success: success_callback,
			  error: function(data) {
				var errorObj = JSON.parse(data.responseText);
				error_callback(errorObj.message);
			  }
	});
};

tc_crypto.start_send = function(from_address, to_address, amount, success_callback, error_callback) {
	jQuery.ajax({
			  url: "https://api.trustedcoin.com/1/cosigner/" + from_address + "/send_start",
			  type: "POST",
			  data: JSON.stringify({"output_address": to_address, "amount": amount}),
			  dataType: "json",
			  contentType : 'application/json',		  
			  beforeSend: function(x) {
				if (x && x.overrideMimeType) {
				  x.overrideMimeType("application/j-son;charset=UTF-8");
				}
			  },
			  success: success_callback,
			  error: function(data) {
				var errorObj = JSON.parse(data.responseText);
				error_callback(errorObj.message);
			  }
	});
};
