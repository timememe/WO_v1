import codecs

# Read file
with codecs.open('engine.js', 'r', 'utf-8-sig') as f:
    lines = f.readlines()

# Find checkPoints method (around line 413-437)
start_line = None
end_line = None

for i, line in enumerate(lines):
    if 'checkPoints(winner, loser)' in line:
        start_line = i
        # Find the closing brace
        brace_count = 0
        for j in range(i, len(lines)):
            brace_count += lines[j].count('{') - lines[j].count('}')
            if brace_count == 0 and j > i:
                end_line = j
                break
        break

if start_line is None:
    print('ERROR: Could not find checkPoints method')
    exit(1)

print(f'Found checkPoints from line {start_line+1} to {end_line+1}')

# Create new method
new_method_lines = [
    '    checkPoints(winner, loser) {\n',
    '        // Новая система: точки зажигаются по достижению порогов весов\n',
    '        // Проверяем, пересекли ли мы новый порог\n',
    '\n',
    '        if (this.scales > 0) {\n',
    '            // Игрок впереди - проверяем пороги для игрока\n',
    '            for (let i = 0; i < this.SCALES_THRESHOLDS.length; i++) {\n',
    '                const threshold = this.SCALES_THRESHOLDS[i];\n',
    '                if (this.scales >= threshold && this.scalesPointsEarned.player < (i + 1)) {\n',
    '                    // Зажигаем точку игроку\n',
    '                    this.player.points = i + 1;\n',
    '                    this.scalesPointsEarned.player = i + 1;\n',
    '                    this.uiManager.addMessage(`Ты зажигаешь точку ${i + 1}! Весы убеждённости: +${this.scales}`, \'player\');\n',
    '                    break;\n',
    '                }\n',
    '            }\n',
    '        } else if (this.scales < 0) {\n',
    '            // Скептик впереди - проверяем пороги для противника\n',
    '            for (let i = 0; i < this.SCALES_THRESHOLDS.length; i++) {\n',
    '                const threshold = -this.SCALES_THRESHOLDS[i]; // Отрицательные пороги: -4, -7, -10\n',
    '                if (this.scales <= threshold && this.scalesPointsEarned.enemy < (i + 1)) {\n',
    '                    // Зажигаем точку скептику\n',
    '                    this.enemy.points = i + 1;\n',
    '                    this.scalesPointsEarned.enemy = i + 1;\n',
    '                    this.uiManager.addMessage(`Скептик зажигает точку ${i + 1}! Весы убеждённости: ${this.scales}`, \'enemy\');\n',
    '                    break;\n',
    '                }\n',
    '            }\n',
    '        }\n',
    '    }\n',
]

# Replace the method
new_lines = lines[:start_line] + new_method_lines + lines[end_line+1:]

# Write back
with codecs.open('engine.js', 'w', 'utf-8') as f:
    f.writelines(new_lines)

print(f'Successfully replaced checkPoints method ({len(lines[start_line:end_line+1])} lines -> {len(new_method_lines)} lines)')
