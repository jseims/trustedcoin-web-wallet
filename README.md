trustedcoin-web-wallet
======================

A bitcoin wallet built on TrustedCoin APIs, making it secure to use even on keylogged computers.

See https://api.trustedcoin.com/wallet/#/ for a live demo.

The way this wallet works in:

1) User creates 2 keys (on 2 different devices if sufficiently worried about keyloggers).

2) These keys are generated from 12-word mnemonics, which are easy to write down.

3) TrustedCoin creates a 2-of-3 multisig address for the user.  Any tranaction trying to spend from this wallet will cause TrustedCoin to email and sms the user, and give the user 24 hours to cancel the transaction.

If one of the private keys is compromised, or if TrustedCoin disappears, this wallet also allows the user to instantly move all the funds by combining both 12-word mnemonics.