import codecs

# Read file
with codecs.open('engine.js', 'r', 'utf-8-sig') as f:
    lines = f.readlines()

# Find line 115 and add scales initialization after updateStats
modified = False
for i in range(len(lines)):
    if 'this.uiManager.updateStats(this.player, this.enemy);' in lines[i]:
        # Check if this is line ~115 in startGame method
        if i > 90 and i < 120:
            # Add scales update after this line
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]  # Get the indentation
            lines.insert(i + 1, indent + 'if (this.uiManager.updateScales) this.uiManager.updateScales(this.scales);\n')
            modified = True
            print(f'Added initial scales update after line {i+1}')
            break

if not modified:
    print('ERROR: Could not find the right updateStats call in startGame()')
    exit(1)

# Write back
with codecs.open('engine.js', 'w', 'utf-8') as f:
    f.writelines(lines)

print('File written successfully')
