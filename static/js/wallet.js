/*
 * wallet.js
 * (c) 2013 TrustedCoin http://api.trustedcoin.com
 * License: MIT
 */

var myModule = angular.module('myModule', [])
  .config(function($routeProvider, $locationProvider, $httpProvider) {
    $routeProvider.
      when('/', {controller:VisitorCtrl, templateUrl:'static/partials/wallet.html'}).
      when('/create-wallet', {controller:CreateWalletCtrl, templateUrl:'static/partials/create-wallet.html'}).
      when('/wallet/:address', {controller:WalletCtrl, templateUrl:'static/partials/view-wallet.html'}).
      when('/wallet_security/:address', {controller:WalletSecurityCtrl, templateUrl:'static/partials/wallet-security.html'}).
      when('/gen-key', {controller:GenKeyCtrl, templateUrl:'static/partials/gen-key.html'}).
      otherwise({redirectTo:'/'});
  })
  // using qrcode directive from https://github.com/monospaced/angular-qrcode
    .directive('qrcode', ['$timeout', '$window', function($timeout, $window){

    var canvas2D = !!$window.CanvasRenderingContext2D,
        levels = {
          'L': 'Low',
          'M': 'Medium',
          'Q': 'Quartile',
          'H': 'High'
        },
        draw = function(context, qr, modules, tile){
          for (var row = 0; row < modules; row++) {
            for (var col = 0; col < modules; col++) {
              var w = (Math.ceil((col + 1) * tile) - Math.floor(col * tile)),
                  h = (Math.ceil((row + 1) * tile) - Math.floor(row * tile));
              context.fillStyle = qr.isDark(row, col) ? '#000' : '#fff';
              context.fillRect(Math.round(col * tile), Math.round(row * tile), w, h);
            }
          }
        };

    return {
      restrict: 'E',
      template: '<canvas></canvas>',
      link: function(scope, element, attrs){

        var domElement = element[0],
            canvas = element.find('canvas')[0],
            version = Math.max(1, Math.min(parseInt(attrs.version, 10), 10)) || 4,
            correction = attrs.errorCorrectionLevel in levels ? attrs.errorCorrectionLevel : 'M',
            trim = /^\s+|\s+$/g,
            qr = qrcode(version, correction);

        qr.make();

        var modules = qr.getModuleCount(),
            size = parseInt(attrs.size, 10) || modules * 2,
            tile = size / modules,
            render = function(qr, text){
              qr.addData(text);
              qr.make();
              if (canvas2D) {
                draw(context, qr, modules, tile);
              } else {
                domElement.innerHTML = qr.createImgTag(tile, 0);
              }
            };

        if (canvas2D) {
          var context = canvas.getContext('2d');
          canvas.width = canvas.height = size;
        }

        attrs.$observe('data', function(value){
          if (!value) {
            return;
          }
          var text = value.replace(trim, ''),
              qr = qrcode(version, correction);
          render(qr, text);
        });
      }
    };
  }])
  .run(function($rootScope, $log, $location, $filter, $http, $timeout, $window) {
    $rootScope.site_name = 'Trusted Coin';
	
    var track = function() {
        $window._gaq.push(['_trackPageview', $location.path()]);
    };
    $rootScope.$on('$viewContentLoaded', track);	
});

function VisitorCtrl($scope, $rootScope, $http, $location, $routeParams, $log) {
}

var keyProgressCallback = function(percentDone) {
	if(percentDone % 5 == 0) {
		$('#seed-progress').css('width', (percentDone + 19) + '%'); 
	}
};

function GenKeyCtrl($scope, $rootScope, $http, $location, $routeParams, $log) {

    $scope.mnemonic = trustedcoin.generate_mnemonic();
	$scope.key = null;
	$scope.show_progress = false;
	
	var keyReadyCallback = function(data) {
		//$log.log(data);
		$scope.show_progress = false;
		
		$scope.$apply(function() {
			$scope.key = data.key;
		});
	}
	
	$scope.refresh_mnemonic = function() {
		$scope.mnemonic = trustedcoin.generate_mnemonic();
		$scope.key = null;
		$('#seed-progress').css('width', '0%');
		$scope.show_progress = false;
	}
	
	$scope.generate_key = function() {
		$scope.show_progress = true;
        trustedcoin.mnemonic_to_key($scope.mnemonic, keyReadyCallback, keyProgressCallback);	
	}
}

function CreateWalletCtrl($scope, $rootScope, $http, $location, $routeParams, $log, $timeout) {
	$scope.state = "choose_backup";
    $scope.backup_mnemonic = trustedcoin.generate_mnemonic();
    $scope.primary_mnemonic = trustedcoin.generate_mnemonic();
	$scope.show_progress = false;

	$scope.refresh_backup_mnemonic = function() {
		$scope.backup_mnemonic = trustedcoin.generate_mnemonic();
	};

	$scope.refresh_primary_mnemonic = function() {
		$scope.primary_mnemonic = trustedcoin.generate_mnemonic();
	};
	
	var backupKeyReadyCallback = function(key) {
		$scope.show_progress = false;
		
		$scope.$apply(function() {
			$scope.secondary_public_key = key.publicKey;
		});
		$scope.state = "choose_primary";
		$scope.$apply();
	};
	
	$scope.generate_backup_key = function() {
		$scope.show_progress = true;
        trustedcoin.mnemonic_to_key($scope.backup_mnemonic, backupKeyReadyCallback, keyProgressCallback);	
	};
	
	var primaryKeyReadyCallback = function(key) {
		//$log.log(key);
		$scope.show_progress = false;
		
		$scope.$apply(function() {
			$scope.primary_public_key = key.publicKey;
		});
		$scope.state = "verify_primary";
		$scope.$apply();
	};
	
	$scope.generate_primary_key = function() {
		$scope.show_progress = true;
        trustedcoin.mnemonic_to_key($scope.primary_mnemonic, primaryKeyReadyCallback, keyProgressCallback);	
	};
	
	$scope.verify_primary_mnemonic = function() {
		if ($scope.verify_mnemonic == $scope.primary_mnemonic) {
			$timeout(function() {
				$scope.state = "enter_contacts";
				$scope.$apply();
			});
		} else {
			$scope.not_verified = true;
		}
	}
	
	var createWalletCallback = function(data) {
		$log.log(data);
		$location.path("/wallet/" + data.address);
		$scope.$apply();		
	};
	
	var errorCallback = function(text) {
		$scope.error = text;
		$scope.$apply();
		$log.log(text);
	};		
	
	
	$scope.create_wallet = function() {
		$log.log("primary public key: " + $scope.primary_public_key);
		$log.log("secondary public key: " + $scope.secondary_public_key);
		$log.log("phone " + $scope.phone);
		$log.log("email " + $scope.email);
		if (!$scope.primary_public_key || !$scope.secondary_public_key) {
			$scope.error = "You're missing a private key -- try starting over";
		} else if (!$scope.email && !$scope.phone) {
			$scope.error = "You need to provide at least one contact channel";
		} else {
			policy = {"type" : "latency", "delay_in_seconds": 86400, "contacts":  [{"email" : $scope.email}, {"sms" : $scope.phone}]};
			trustedcoin.create_cosigner($scope.primary_public_key, $scope.secondary_public_key, policy, createWalletCallback, errorCallback);
		}
	}	
	
}	


function WalletCtrl($scope, $rootScope, $http, $location, $routeParams, $log) {
	$scope.address = $routeParams.address;
	var key = $scope.address + "-mnemonic";
	$scope.encrypted_mnemonic =	localStorage.getItem(key);
	
	var balanceCallback = function(text) {
		$scope.balance = Bitcoin.Util.formatValue(text);
		$scope.$apply();		
	};
	
	
	BLOCKCHAIN.retrieveBalance($scope.address, balanceCallback);
	
	var getWalletCallback = function(data) {
		$scope.wallet = data;		
		$scope.$apply();		
	};
	
	var getErrorCallback = function(text) {
		$scope.get_error = text;
		$scope.$apply();
	};	
	
	trustedcoin.get_cosigner($scope.address, getWalletCallback, getErrorCallback);
	
	var startSendCallback = function(data) {
		$log.log(data);
		$scope.unsigned_transaction = data.unsigned_transaction;
		$scope.inputs = data.inputs;
		$scope.prompt_sign = true;
		$scope.send_error = null;
		$scope.$apply();
	};	
	
	var sendErrorCallback = function(text) {
		$scope.send_error = text;
		$scope.$apply();
	};	
	
	var finishSendCallback = function(data) {
		$log.log(data);
	};	
	
	
	$scope.send_btc = function() {
		var amount = parseInt($scope.to_amount);
		$log.log("sending " + amount + " to " + $scope.to_address);
		var satoshis = parseFloat($scope.to_amount) * 100000000;
		if (satoshis > 0) {
			$scope.send_error = null;
			trustedcoin.send_start($scope.address, $scope.to_address, satoshis, startSendCallback, sendErrorCallback);
		} else {
			$scope.send_error = "Must enter a valid number of BTC for 'Amount'";
			
		}
	};
	
	var keyReadyCallback = function(data) {
		//$log.log(key);
		$scope.show_progress = false;
		
		$scope.$apply(function() {
			$scope.key = data.key;
		});
		$log.log("signing " + $scope.unsigned_transaction + " with " + $scope.key.privateKey);
		$log.log(key);
		
		var signed = trustedcoin.sign_transaction($scope.unsigned_transaction, $scope.inputs, [$scope.key]);
		
		$log.log("signed: " + signed);
		
		trustedcoin.send_finish($scope.address, signed, null, finishSendCallback, sendErrorCallback);
	};
	
	$scope.sign_transaction = function() {
		$scope.show_progress = true;
        trustedcoin.mnemonic_to_key($scope.mnemonic, keyReadyCallback, keyProgressCallback);	
	};
	
	$scope.encrypt_mnemonic = function() {
		$scope.encrypted_mnemonic = trustedcoin.encrypt($scope.mnemonic, $scope.password);
		$scope.password = null;
		var key = $scope.address + "-mnemonic";
		localStorage.setItem(key, $scope.encrypted_mnemonic);
	};
	
	$scope.remove_local_mnemonic = function() {
		var key = $scope.address + "-mnemonic";
		localStorage.removeItem(key);
		$scope.encrypted_mnemonic = null;
	};
}


function WalletSecurityCtrl($scope, $rootScope, $http, $location, $routeParams, $log) {
	$scope.address = $routeParams.address;
	var key = $scope.address + "-mnemonic";
	$scope.encrypted_mnemonic =	localStorage.getItem(key);
	
	var balanceCallback = function(text) {
		$scope.balance = Bitcoin.Util.formatValue(text);
		$scope.$apply();		
	};
	
	
	BLOCKCHAIN.retrieveBalance($scope.address, balanceCallback);
	
	var getWalletCallback = function(data) {
		$scope.wallet = data;		
		$scope.$apply();		
	};
	
	var getErrorCallback = function(text) {
		$scope.get_error = text;
		$scope.$apply();
	};	
	
	trustedcoin.get_cosigner($scope.address, getWalletCallback, getErrorCallback);

	var txCallback = function(text) {
		$log.log("tx sent");
		$log.log(text);		
	};
		
	var backupKeyReadyCallback = function(data) {
		$log.log(data);
		$scope.show_progress = false;
		$scope.$apply();
		$scope.backup_key = data.key;
		$log.log("found backup key");
		$log.log($scope.backup_key);
		
		// computer actual amount, minus fee
		var fee = 0.0001;
		var balance = $scope.unspent['balance'];
		var amount = $scope.amount;
		if (fee < balance) {
			amount = Math.min(amount, balance - fee);
			var tx = trustedcoin.construct_transaction($scope.address, $scope.to_address, amount, fee, $scope.unspent, $scope.wallet.script, $scope.primary_key, $scope.backup_key);
			$log.log(tx);
			BLOCKCHAIN.sendTX_coinb(tx, txCallback);
		} else {
			$scope.get_error = "Too small a balance to send (less than miner fee)";
			$scope.$apply();
		}
	};	
	
	var primaryKeyReadyCallback = function(data) {
		$log.log(data);
		$scope.primary_key = data.key;
		$log.log("found primary key");
		$log.log($scope.primary_key);
		
		trustedcoin.mnemonic_to_key($scope.backup_mnemonic, backupKeyReadyCallback, keyProgressCallback);	
	};

	var parseUnspent = function(text) {
		try {
			$scope.unspent = trustedcoin.parse_unspent(text);
			$log.log($scope.unspent);
			$scope.show_progress = true;
			$scope.$apply();
			trustedcoin.mnemonic_to_key($scope.primary_mnemonic, primaryKeyReadyCallback, keyProgressCallback);	
		} catch(err) {
			$scope.get_error = "Error in parsing unspent outputs";
			$scope.$apply();
		}
	};
	
	$scope.send_btc = function() {
		BLOCKCHAIN.getUnspentOutputs($scope.address, parseUnspent);

	};
	
}


