import codecs

# Read file
with codecs.open('engine.js', 'r', 'utf-8-sig') as f:
    lines = f.readlines()

# Find and add UI update after applyDamageWithScales call
modified = False
for i in range(len(lines)):
    if i >= len(lines) - 1:
        break
    # Look for the applyDamageWithScales line
    if 'this.applyDamageWithScales(target, targetStat, finalDamage, logDetails);' in lines[i]:
        # Insert the UI update after this line
        indent = '                    '
        lines.insert(i + 1, indent + '// Обновляем визуализацию весов\n')
        lines.insert(i + 2, indent + 'if (this.uiManager && this.uiManager.updateScales) {\n')
        lines.insert(i + 3, indent + '    this.uiManager.updateScales(this.scales);\n')
        lines.insert(i + 4, indent + '}\n')
        modified = True
        print(f'Added UI update after line {i+1}')
        break

if not modified:
    print('ERROR: Could not find applyDamageWithScales call')
    exit(1)

# Write back
with codecs.open('engine.js', 'w', 'utf-8') as f:
    f.writelines(lines)

print('File written successfully')
