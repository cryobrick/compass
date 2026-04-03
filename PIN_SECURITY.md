# PIN security (how we handle your 6-digit PIN)

We never save your PIN anywhere. When you set a PIN we do two things:

1. We generate a random value (called salt) and keep it in the app storage.
2. We run your PIN plus that salt through a one-way hash (SHA-256). We save only the result of that hash.

So what is stored on the device is: the random salt and the hash. Not the PIN itself. If someone gets access to the app storage they still cannot get your PIN back from the hash because the hash is one-way. When you type your PIN to unlock we hash what you typed (with the same salt) and compare. If it matches we let you in.

This is a standard way to check passwords or PINs without storing them. The salt makes it harder for anyone to guess PINs by trying common combinations against the stored hash.

What this does not do: it does not encrypt your wallet or mnemonic. The PIN only controls who can open the app (compass unlock). Your wallet data is still in the device storage. So if someone has full access to the device they might still get the wallet data. The PIN is there to stop casual access and to hide the wallet behind the compass screen.
