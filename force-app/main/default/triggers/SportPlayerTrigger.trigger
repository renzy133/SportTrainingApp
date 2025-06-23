trigger SportPlayerTrigger on SportPlayer__c (before insert, before update) {
    
    // Проверяем уникальность номера майки в команде
    Set<Id> teamIds = new Set<Id>();
    Map<String, SportPlayer__c> teamJerseyMap = new Map<String, SportPlayer__c>();
    
    // Собираем ID команд и создаем ключи для проверки
    for (SportPlayer__c player : Trigger.new) {
        if (player.Team__c != null && player.Jersey_Number__c != null) {
            teamIds.add(player.Team__c);
            String key = player.Team__c + '_' + player.Jersey_Number__c;
            teamJerseyMap.put(key, player);
        }
    }
    
    if (!teamIds.isEmpty()) {
        // Ищем существующих игроков с такими же номерами в тех же командах
        List<SportPlayer__c> existingPlayers = [
            SELECT Id, Team__c, Jersey_Number__c 
            FROM SportPlayer__c 
            WHERE Team__c IN :teamIds 
            AND Jersey_Number__c != null
        ];
        
        // Проверяем конфликты
        for (SportPlayer__c existingPlayer : existingPlayers) {
            String key = existingPlayer.Team__c + '_' + existingPlayer.Jersey_Number__c;
            
            if (teamJerseyMap.containsKey(key)) {
                SportPlayer__c newPlayer = teamJerseyMap.get(key);
                
                // Если это update, проверяем что это не тот же игрок
                if (Trigger.isUpdate && newPlayer.Id == existingPlayer.Id) {
                    continue;
                }
                
                newPlayer.Jersey_Number__c.addError(
                    'Numer koszulki ' + newPlayer.Jersey_Number__c + 
                    ' jest już używany przez innego zawodnika w tej drużynie!'
                );
            }
        }
    }
}