var myModule = angular.module('wallet', []);

function WalletCtrl($scope, $rootScope, $http, $location, $log) {
    
    $log.log(Crypto.util.bytesToHex(Bitcoin.Address.decodeString('1JwSSubhmg6iPtRjtyqhUYYH7bZg3Lfy1T')));

    $scope.mnemonic = "steal night raise foot struggle royal laid worse embrace mutter lady chance";
    
    $scope.computeSeed = function(percent) {
        
        $log.log("computeSeed");
        
        var keyProgressCallback = function(percentDone) {
            if(percentDone % 5 == 0) {
                $('#seed-progress').css('width', (percentDone + 19) + '%'); 
            }
        };
        
        var keyReadyCallback = function(key) {
            $log.log("key ready");
            $log.log(key);
            
            $scope.$apply(function() {
                $scope.keys = [key];
            });
        }
        
        tc_crypto.mnemoic_to_key($scope.mnemonic, keyReadyCallback, keyProgressCallback);
    };
    
    
    $scope.generateSeed = function() {
        $scope.mnemonic = tc_crypto.generate_mnemonic();
    }
    
    $scope.signTx = function() {
        
        $log.log($scope.txToSign);
        
        $log.log($scope.keys[0]);
        
        var m = $scope.txToSign;
        m = "x-timestamp: " + (new Date()).valueOf();
        
        $log.log("signing:" + m)
        
        sig = sign_message($scope.keys[0].key, m, $scope.keys[0].key.isCompressed());
        
        $log.log(sig);
        
        $log.log(verify_message(sig, m));
        
        var auth = 'Signature keyId="' + $scope.keys[0].address + '",algorithm="bitcoin",headers="x-timestamp",signature="' + sig + '"';
        // we can't set the date like http://tools.ietf.org/html/draft-cavage-http-signatures-00
        // because it's illegal to set that header in an xhr ... so we do this instead
        var headers = {
            'Authorization': auth,
            'x-timestamp': m
        };
        $http({method: 'GET', url: '/1/test', headers: headers}).
            success(function(data, status, headers, config) {
                // this callback will be called asynchronously
                // when the response is available
            }).
            error(function(data, status, headers, config) {
                // called asynchronously if an error occurs
                // or server returns response with an error status.
            });
    }
}
