import codecs
import re

# Read file
with codecs.open('engine.js', 'r', 'utf-8-sig') as f:
    content = f.read()

# Find and replace the checkPoints method
# Use regex to match the entire method
old_method = r'checkPoints\(winner, loser\) \{[^}]*logicDepleted[^}]*emotionDepleted[^}]*negativeTurns[^}]*\}'

new_method = '''checkPoints(winner, loser) {
        // Новая система: точки зажигаются по достижению порогов весов
        // Проверяем, пересекли ли мы новый порог

        if (this.scales > 0) {
            // Игрок впереди - проверяем пороги для игрока
            for (let i = 0; i < this.SCALES_THRESHOLDS.length; i++) {
                const threshold = this.SCALES_THRESHOLDS[i];
                if (this.scales >= threshold && this.scalesPointsEarned.player < (i + 1)) {
                    // Зажигаем точку игроку
                    this.player.points = i + 1;
                    this.scalesPointsEarned.player = i + 1;
                    this.uiManager.addMessage(`Ты зажигаешь точку ${i + 1}! Весы убеждённости: +${this.scales}`, 'player');
                    break;
                }
            }
        } else if (this.scales < 0) {
            // Скептик впереди - проверяем пороги для противника
            for (let i = 0; i < this.SCALES_THRESHOLDS.length; i++) {
                const threshold = -this.SCALES_THRESHOLDS[i]; // Отрицательные пороги: -4, -7, -10
                if (this.scales <= threshold && this.scalesPointsEarned.enemy < (i + 1)) {
                    // Зажигаем точку скептику
                    this.enemy.points = i + 1;
                    this.scalesPointsEarned.enemy = i + 1;
                    this.uiManager.addMessage(`Скептик зажигает точку ${i + 1}! Весы убеждённости: ${this.scales}`, 'enemy');
                    break;
                }
            }
        }
    }'''

# Replace using regex
content_new = re.sub(old_method, new_method, content, flags=re.DOTALL)

if content_new == content:
    print('ERROR: Could not find checkPoints method')
    exit(1)

# Write back
with codecs.open('engine.js', 'w', 'utf-8') as f:
    f.write(content_new)

print('checkPoints method replaced successfully')
