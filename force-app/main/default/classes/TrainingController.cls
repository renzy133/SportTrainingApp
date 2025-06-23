public class TrainingController {
    
    @AuraEnabled(cacheable=true)
    public static List<User> getCoaches() {
        return [
            SELECT Id, Name 
            FROM User 
            WHERE IsActive = true 
            AND UserType = 'Standard'
            ORDER BY Name
        ];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<SportTraining__c> getUpcomingTrainings(Id teamId) {
        if (teamId == null) {
            return new List<SportTraining__c>();
        }
        
        Date today = Date.today();
        List<SportTraining__c> trainings = [
            SELECT Id, Name, Training_Date__c, Start_Time__c, Duration__c, Type__c, 
                   Team__r.Name, Coach__c, Coach__r.Name
            FROM SportTraining__c 
            WHERE Team__c = :teamId 
            AND Training_Date__c >= :today
            ORDER BY Training_Date__c, Start_Time__c
        ];
        
        // Debugowanie
        for(SportTraining__c training : trainings) {
            System.debug('Training: ' + training.Name + ', Time: ' + training.Start_Time__c);
        }
        
        return trainings;
    }
    
    @AuraEnabled
    public static SportTraining__c createTraining(Id teamId, Date trainingDate, String startTime, Integer duration, String trainingType, Id coachId) {
        try {
            // Parsowanie czasu
            Integer hour = 9;
            Integer minute = 0;
            
            if (startTime != null && startTime.contains(':')) {
                List<String> timeParts = startTime.split(':');
                if (timeParts.size() >= 2) {
                    hour = Integer.valueOf(timeParts[0]);
                    minute = Integer.valueOf(timeParts[1]);
                }
            }
            
            SportTraining__c newTraining = new SportTraining__c(
                Team__c = teamId,
                Training_Date__c = trainingDate,
                Start_Time__c = Time.newInstance(hour, minute, 0, 0),
                Duration__c = duration,
                Type__c = trainingType,
                Coach__c = coachId != null ? coachId : UserInfo.getUserId()
            );
            insert newTraining;
            
            // Automatycznie tworzymy rekordy frekwencji
            AttendanceManager.createAttendanceRecords(newTraining.Id);
            
            return newTraining;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating training: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void deleteTraining(Id trainingId) {
        try {
            delete [SELECT Id FROM SportTraining__c WHERE Id = :trainingId];
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting training: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateTraining(Id trainingId, Date trainingDate, String startTime, Integer duration, String trainingType, Id coachId) {
        try {
            Integer hour = 9;
            Integer minute = 0;
            
            if (startTime != null && startTime.contains(':')) {
                List<String> timeParts = startTime.split(':');
                if (timeParts.size() >= 2) {
                    hour = Integer.valueOf(timeParts[0]);
                    minute = Integer.valueOf(timeParts[1]);
                }
            }
            
            SportTraining__c training = [SELECT Id FROM SportTraining__c WHERE Id = :trainingId];
            training.Training_Date__c = trainingDate;
            training.Start_Time__c = Time.newInstance(hour, minute, 0, 0);
            training.Duration__c = duration;
            training.Type__c = trainingType;
            training.Coach__c = coachId;
            
            update training;
        } catch (Exception e) {
            throw new AuraHandledException('Error updating training: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<TrainingWithAttendance> getTrainingHistory(Id teamId, Integer lastNDays) {
        Date startDate = Date.today().addDays(-lastNDays);
        
        List<SportTraining__c> trainings = [
            SELECT Id, Name, Training_Date__c, Start_Time__c, Type__c
            FROM SportTraining__c 
            WHERE Team__c = :teamId 
            AND Training_Date__c >= :startDate
            ORDER BY Training_Date__c DESC
        ];
        
        List<TrainingWithAttendance> result = new List<TrainingWithAttendance>();
        
        for(SportTraining__c training : trainings) {
            Integer attendanceCount = [
                SELECT COUNT() 
                FROM SportAttendance__c 
                WHERE Training__c = :training.Id 
                AND Status__c = 'Obecny'
            ];
            
            result.add(new TrainingWithAttendance(training, attendanceCount));
        }
        
        return result;
    }
    
    public class TrainingWithAttendance {
        @AuraEnabled public SportTraining__c training { get; set; }
        @AuraEnabled public Integer attendanceCount { get; set; }
        
        public TrainingWithAttendance(SportTraining__c training, Integer attendanceCount) {
            this.training = training;
            this.attendanceCount = attendanceCount;
        }
    }
}