public class AttendanceManager {
    
    @AuraEnabled
    public static void createAttendanceRecords(Id trainingId) {
        try {
            if (trainingId == null) {
                return;
            }
            
            List<SportTraining__c> trainings = [
                SELECT Team__c 
                FROM SportTraining__c 
                WHERE Id = :trainingId 
                LIMIT 1
            ];
            
            if (trainings.isEmpty() || trainings[0].Team__c == null) {
                return;
            }
            
            SportTraining__c training = trainings[0];
            
            List<SportPlayer__c> players = [
                SELECT Id 
                FROM SportPlayer__c 
                WHERE Team__c = :training.Team__c
            ];
            
            // Sprawdzamy czy rekordy już istnieją
            Set<Id> existingPlayerIds = new Set<Id>();
            for(SportAttendance__c existing : [
                SELECT Player__c 
                FROM SportAttendance__c 
                WHERE Training__c = :trainingId
            ]) {
                existingPlayerIds.add(existing.Player__c);
            }
            
            List<SportAttendance__c> attendanceList = new List<SportAttendance__c>();
            for(SportPlayer__c player : players) {
                if(!existingPlayerIds.contains(player.Id)) {
                    attendanceList.add(new SportAttendance__c(
                        Training__c = trainingId,
                        Player__c = player.Id,
                        Status__c = 'Nieobecny'
                    ));
                }
            }
            
            if(!attendanceList.isEmpty()) {
                insert attendanceList;
            }
            
        } catch (Exception e) {
            throw new AuraHandledException('Error creating attendance records: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<SportAttendance__c> getTrainingAttendance(Id trainingId) {
        if (trainingId == null) {
            return new List<SportAttendance__c>();
        }
        
        return [
            SELECT Id, Player__c, Player__r.Name, Player__r.Jersey_Number__c, 
                   Status__c, Notes__c
            FROM SportAttendance__c 
            WHERE Training__c = :trainingId
            ORDER BY Player__r.Jersey_Number__c, Player__r.Name
        ];
    }
    
    @AuraEnabled
    public static void updateAttendanceStatus(Id attendanceId, String status, String notes) {
        try {
            SportAttendance__c attendance = [
                SELECT Id 
                FROM SportAttendance__c 
                WHERE Id = :attendanceId
            ];
            
            attendance.Status__c = status;
            attendance.Notes__c = notes;
            
            update attendance;
        } catch (Exception e) {
            throw new AuraHandledException('Error updating attendance: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateBulkAttendance(List<Map<String, Object>> attendanceData) {
        try {
            List<SportAttendance__c> toUpdate = new List<SportAttendance__c>();
            
            for(Map<String, Object> data : attendanceData) {
                SportAttendance__c attendance = new SportAttendance__c(
                    Id = (Id)data.get('id'),
                    Status__c = (String)data.get('status'),
                    Notes__c = (String)data.get('notes')
                );
                toUpdate.add(attendance);
            }
            
            if(!toUpdate.isEmpty()) {
                update toUpdate;
            }
        } catch (Exception e) {
            throw new AuraHandledException('Error updating attendance records: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getAttendanceStats(Id teamId, Integer days) {
        Date startDate = Date.today().addDays(-days);
        
        List<AggregateResult> stats = [
            SELECT Status__c, COUNT(Id) cnt
            FROM SportAttendance__c
            WHERE Training__r.Team__c = :teamId
            AND Training__r.Training_Date__c >= :startDate
            GROUP BY Status__c
        ];
        
        Map<String, Object> result = new Map<String, Object>{
            'Obecny' => 0,
            'Nieobecny' => 0,
            'Usprawiedliwiony' => 0
        };
        
        for(AggregateResult ar : stats) {
            String status = (String)ar.get('Status__c');
            Integer count = (Integer)ar.get('cnt');
            result.put(status, count);
        }
        
        return result;
    }
}