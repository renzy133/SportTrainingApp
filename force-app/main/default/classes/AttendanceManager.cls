public class AttendanceManager {
    
    @AuraEnabled
    public static void createAttendanceRecords(Id trainingId) {
        try {
            // Получаем тренировку и команду
            SportTraining__c training = [
                SELECT Team__c 
                FROM SportTraining__c 
                WHERE Id = :trainingId 
                LIMIT 1
            ];
            
            // Получаем всех активных игроков команды
            List<SportPlayer__c> players = [
                SELECT Id 
                FROM SportPlayer__c 
                WHERE Team__c = :training.Team__c
            ];
            
            // Создаем записи посещаемости
            List<SportAttendance__c> attendanceList = new List<SportAttendance__c>();
            for(SportPlayer__c player : players) {
                attendanceList.add(new SportAttendance__c(
                    Training__c = trainingId,
                    Player__c = player.Id,
                    Status__c = 'Nieobecny'
                ));
            }
            
            if(!attendanceList.isEmpty()) {
                insert attendanceList;
            }
            
        } catch (Exception e) {
            throw new AuraHandledException('Error creating attendance records: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<SportAttendance__c> getTrainingAttendance(Id trainingId) {
        return [
            SELECT Id, Player__c, Player__r.Name, Status__c, Notes__c
            FROM SportAttendance__c 
            WHERE Training__c = :trainingId
            ORDER BY Player__r.Name
        ];
    }
}