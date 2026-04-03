# Understanding UR (Uniform Resource) Format and Multi-Part QR Codes

## What is UR Format?

**UR (Uniform Resource)** is a standard format for encoding data in QR codes, developed specifically for cryptocurrency applications. It's used by wallets like Blue Wallet to transfer PSBTs (Partially Signed Bitcoin Transactions) between devices.

## Why Multi-Part QR Codes?

QR codes have size limitations. A single QR code can only hold a certain amount of data (typically around 2-3KB depending on error correction level). When PSBTs are large (which they often are for complex transactions), they need to be split across multiple QR codes.

## How Multi-Part URs Work

### Format Structure

Each QR code part follows this format:

```
UR:CRYPTO-PSBT/[PART]-[TOTAL]/[ENCODED_DATA]
```

**Example:**

- Part 1 of 2: `UR:CRYPTO-PSBT/1-2/LPADAOCSRNCYGUSGATLSHDHEHDRFJOJKIDJYZMADAEGUAOAEAEAEADBBECINHSCXYKLEFHLOVWGAOYPEJZFZJYLFGTSBVEFLOYKTBGLTPEHNKPDKLDTPTTAEAEAEAEAEZMZMZMZMADMUAYAEAEAEAEAEAECHPTBBFZJNRDDTPRAAWSDYAXVOGEDYHYLPQDDIIAZEREKGLTAEAEAEAEAEADKGSPLBID`
- Part 2 of 2: `UR:CRYPTO-PSBT/2-2/LPAOAOCSRNCYGUSGATLSHDHEADCTVLASAEAEAEAEAEAECMAEBBYALPFWPFPKNNHESNKKOEAYIDGWWSMTAHLKQDKGWTCPAMAXCPFDHGFGGHCAWNJSUEENGEGYEMOYYLLSUTZEMKJYTANDPMAAGTEMGDWYWNPKMENTCSAEAEAEAEGHAEAELAAEAEAELAAEAEAELAAEAEAEAEAEAEAEAEAEAEJSHNENET`

### Key Components

1. **`UR:`** - Prefix indicating Uniform Resource format
2. **`CRYPTO-PSBT`** - Type identifier (Cryptocurrency PSBT)
3. **`1-2`** - Part number and total parts (part 1 of 2)
4. **`/...`** - Encoded data (CBOR-encoded PSBT bytes)

### Fountain Codes

The UR format uses **fountain codes** (specifically, the `bc-ur` library uses fountain codes). This means:

- **Redundancy**: You don't need to scan parts in order
- **Error Recovery**: If you miss a part, you can scan any other part
- **Flexibility**: You can scan the same part multiple times (it's ignored)
- **Completion**: Once you have enough parts (even if not all), the decoder can reconstruct the complete PSBT

## How Our Implementation Works

### Sequential Scanning

1. **User starts scanning** - Decoder is initialized
2. **Scan first QR code** - Part 1 is added to decoder
3. **Progress shown** - UI displays "Scanning... X% complete"
4. **Scan second QR code** - Part 2 is added to decoder
5. **Complete** - When decoder has enough parts, PSBT is decoded and parsed

### Decoder State

The decoder maintains state across scans:

- Tracks which parts have been received
- Calculates progress percentage
- Automatically decodes when complete

### Error Handling

- **Incomplete UR**: Shows progress and prompts for more scans
- **Invalid format**: Shows error message
- **Complete**: Automatically proceeds to transaction review

## Blue Wallet Behavior

When you copy a PSBT from Blue Wallet, you get the **base64-encoded PSBT**:

```
cHNidP8BAFMCAAAAARQ1aWEg9Yo/iOVJoa9sQHSCTcvkR6F3EoevYHUkidjRAAAAAAD/////AZMIAAAAAAAAF6kUQG26KbIE7zAD4kowXoWzJ2P+tXuHAAAAAAABAR/jCQAAAAAAABYAFPiFQrCqnl/NeaIIYk/vlgWMs3vwIgYDIkhXRlQd8XHeNkpRN6H3g93+mHTZm60ETTdQ7vGqkZ0YAAAAAFQAAIAAAACAAAAAgAAAAAAAAAAAAAA=
```

But when displayed as QR codes, Blue Wallet:

1. Converts base64 PSBT to UR format
2. Splits into multiple QR codes if needed
3. Displays them sequentially (the QR code "changes" as it cycles through parts)

## Implementation Details

### PSBT Service Functions

- **`addURPart(urString)`** - Add a scanned UR part to the decoder
- **`getURProgress()`** - Get current scanning progress
- **`parsePSBTFromMultiPartUR(urPart)`** - Parse PSBT from multi-part UR (returns null if incomplete)
- **`resetURDecoder()`** - Reset decoder for new scan

### UI Flow

1. **Scanning State**: Shows "Start Scanning" button
2. **Active Scanning**: Shows camera preview (when implemented) and progress bar
3. **Progress Updates**: Updates as each part is scanned
4. **Complete**: Automatically transitions to review state

## Next Steps

The current implementation:

- ✅ Handles multi-part UR decoding
- ✅ Shows progress during scanning
- ✅ Removed text input (scanning only)
- ⏳ Camera integration (to be implemented)

When camera is added, the flow will be:

1. User clicks "Start Scanning"
2. Camera opens
3. User scans first QR code → Part 1 added
4. User scans second QR code → Part 2 added
5. PSBT automatically decoded and displayed

## Testing

For now, you can test the multi-part UR functionality by:

1. Using the two UR strings you provided
2. Manually calling `processScannedQR()` with each part sequentially
3. Verifying that the PSBT is correctly decoded after both parts

Once camera is implemented, this will work seamlessly with QR code scanning.
