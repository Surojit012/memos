import re

with open('app/dashboard/page.tsx', 'r') as f:
    content = f.read()

features_to_extract = [
    "ComputeFundingTab",
    "BrainSnapshotsTab",
    "InferenceLabTab",
    "ManifestStatusTab",
    "A2ASharingTab",
    "EncryptedVaultTab"
]

future_features = "# Future Memos Features\n\nThis document contains advanced features that were removed from the initial hackathon build to keep the core narrative focused and simple. They are ready to be integrated back into `app/dashboard/page.tsx` when needed.\n\n"

for feature in features_to_extract:
    # Find the function definition
    pattern = r"// ── .*? ─────────────────────────────────────────────\nfunction " + feature + r"[\s\S]*?(?=\n// ──|\nexport default function)"
    match = re.search(pattern, content)
    if match:
        func_code = match.group(0)
        future_features += f"## {feature}\n```tsx\n{func_code}\n```\n\n"
        content = content.replace(func_code, "")
        print(f"Extracted {feature}")
    else:
        # Try without the comment header
        pattern = r"function " + feature + r"[\s\S]*?(?=\n// ──|\nexport default function)"
        match = re.search(pattern, content)
        if match:
            func_code = match.group(0)
            future_features += f"## {feature}\n```tsx\n{func_code}\n```\n\n"
            content = content.replace(func_code, "")
            print(f"Extracted {feature} (no header)")
        else:
            print(f"Could not find {feature}")

with open('FUTURE_FEATURES.md', 'w') as f:
    f.write(future_features)

with open('app/dashboard/page.tsx', 'w') as f:
    f.write(content)
