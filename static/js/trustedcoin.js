var myModule = angular.module('myModule', [])
  .config(function($routeProvider, $locationProvider, $httpProvider) {
    $routeProvider.
      when('/', {controller:VisitorCtrl, templateUrl:'static/partials/wallet.html'}).
      when('/create-wallet', {controller:CreateWalletCtrl, templateUrl:'static/partials/create-wallet.html'}).
      when('/wallet/:address', {controller:WalletCtrl, templateUrl:'static/partials/view-wallet.html'}).
      when('/gen-key', {controller:GenKeyCtrl, templateUrl:'static/partials/gen-key.html'}).
      otherwise({redirectTo:'/'});
  })
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
  .filter('truncate', function () {
        return function (text, length, end) {
            if (isNaN(length))
                length = 10;
 
            if (end === undefined)
                end = "...";
 
            if (text.length <= length || text.length - end.length <= length) {
                return text;
            }
            else {
                return String(text).substring(0, length-end.length) + end;
            }
 
        };
    })
  .run(function($rootScope, $log, $location, $filter, $http, $timeout, $window) {
    $rootScope.site_name = 'Trusted Coin';
	$rootScope.wallet = { };
});

function VisitorCtrl($scope, $rootScope, $http, $location, $routeParams, $log) {
}

var keyProgressCallback = function(percentDone) {
	if(percentDone % 5 == 0) {
		$('#seed-progress').css('width', (percentDone + 19) + '%'); 
	}
};

function GenKeyCtrl($scope, $rootScope, $http, $location, $routeParams, $log) {

    $scope.mnemonic = tc_crypto.generate_mnemonic();
	$scope.key = null;
	$scope.show_progress = false;
	
	var keyReadyCallback = function(key) {
		//$log.log(key);
		$scope.show_progress = false;
		
		$scope.$apply(function() {
			$scope.key = key;
		});
	}
	
	$scope.refresh_mnemonic = function() {
		$scope.mnemonic = tc_crypto.generate_mnemonic();
		$scope.key = null;
		$('#seed-progress').css('width', '0%');
		$scope.show_progress = false;
	}
	
	$scope.generate_key = function() {
		$scope.show_progress = true;
        tc_crypto.mnemoic_to_key($scope.mnemonic, keyReadyCallback, keyProgressCallback);	
	}
}

function CreateWalletCtrl($scope, $rootScope, $http, $location, $routeParams, $log, $timeout) {
	$scope.state = "choose_backup";
    $scope.backup_mnemonic = tc_crypto.generate_mnemonic();
    $scope.primary_mnemonic = tc_crypto.generate_mnemonic();
	$scope.show_progress = false;

	$scope.refresh_backup_mnemonic = function() {
		$scope.backup_mnemonic = tc_crypto.generate_mnemonic();
	};

	$scope.refresh_primary_mnemonic = function() {
		$scope.primary_mnemonic = tc_crypto.generate_mnemonic();
	};
	
	var backupKeyReadyCallback = function(key) {
		//$log.log(key);
		$scope.show_progress = false;
		
		$scope.$apply(function() {
			$scope.secondary_public_key = key.publicKey;
		});
		$scope.state = "choose_primary";
		$scope.$apply();
	};
	
	$scope.generate_backup_key = function() {
		$scope.show_progress = true;
        tc_crypto.mnemoic_to_key($scope.backup_mnemonic, backupKeyReadyCallback, keyProgressCallback);	
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
        tc_crypto.mnemoic_to_key($scope.primary_mnemonic, primaryKeyReadyCallback, keyProgressCallback);	
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
			tc_crypto.create_cosigner($scope.primary_public_key, $scope.secondary_public_key, policy, createWalletCallback, errorCallback);
		}
	}	
	
}	


function WalletCtrl($scope, $rootScope, $http, $location, $routeParams, $log) {
	$scope.address = $routeParams.address;
	
	var balanceCallback = function(text) {
		$scope.balance = text;		
		$scope.$apply();		
	};
	
	
	BLOCKCHAIN.retrieveBalance($scope.address, balanceCallback);
	
	var getWalletCallback = function(data) {
		$scope.wallet = data;		
		$scope.$apply();		
	};
	
	var getErrorCallback = function(text) {
		$scope.get_error= text;
		$scope.$apply();
	};	
	
	tc_crypto.get_cosigner($scope.address, getWalletCallback, getErrorCallback);
	
	var startSendCallback = function(data) {
		$log.log(data);
		$scope.unsigned_transaction = data.unsigned_transaction;
		$scope.prompt_mnemonic = true;
		$scope.send_error = null;
		$scope.$apply();
	};	
	
	var sendErrorCallback = function(text) {
		$scope.send_error = text;
		$scope.$apply();
	};	
	
	
	$scope.send_btc = function() {
		var amount = parseInt($scope.to_amount);
		$log.log("sending " + amount + " to " + $scope.to_address);
		tc_crypto.start_send($scope.address, $scope.to_address, amount, startSendCallback, sendErrorCallback);
	};
	
	var keyReadyCallback = function(key) {
		//$log.log(key);
		$scope.show_progress = false;
		
		$scope.$apply(function() {
			$scope.key = key;
		});
		$log.log("signing " + $scope.unsigned_transaction + " with " + $scope.key.privateKey);
	};
	
	$scope.sign_transaction = function() {
		$scope.show_progress = true;
        tc_crypto.mnemoic_to_key($scope.mnemonic, keyReadyCallback, keyProgressCallback);	
	};
	
}


