import codecs
import sys

# Read file
with codecs.open('engine.js', 'r', 'utf-8-sig') as f:
    lines = f.readlines()

# Find and replace lines 364-365
modified = False
for i in range(len(lines)):
    if i == 363:  # Line 364 (0-indexed)
        if 'target[targetStat] = (target[targetStat] ?? 0) - finalDamage;' in lines[i]:
            lines[i] = '                    // Используем систему весов - урон сначала по HP, потом в весы\n'
            lines[i+1] = '                    this.applyDamageWithScales(target, targetStat, finalDamage, logDetails);\n'
            modified = True
            print('Lines 364-365 replaced successfully')
            break

if not modified:
    print('ERROR: Could not find target lines')
    sys.exit(1)

# Write back
with codecs.open('engine.js', 'w', 'utf-8') as f:
    f.writelines(lines)

print('File written successfully')
