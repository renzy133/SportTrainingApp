public class TrainingController {
    
    @AuraEnabled(cacheable=true)
    public static List<SportTraining__c> getUpcomingTrainings(Id teamId) {
        Date today = Date.today();
        return [
            SELECT Id, Name, Training_Date__c, Start_Time__c, Duration__c, Type__c, Team__r.Name
            FROM SportTraining__c 
            WHERE Team__c = :teamId 
            AND Training_Date__c >= :today
            ORDER BY Training_Date__c, Start_Time__c
        ];
    }
    
    @AuraEnabled
    public static SportTraining__c createTraining(Id teamId, Date trainingDate, String startTime, Integer duration, String trainingType) {
        try {
            SportTraining__c newTraining = new SportTraining__c(
                Team__c = teamId,
                Training_Date__c = trainingDate,
                Start_Time__c = Time.newInstance(Integer.valueOf(startTime.split(':')[0]), Integer.valueOf(startTime.split(':')[1]), 0, 0),
                Duration__c = duration,
                Type__c = trainingType
            );
            insert newTraining;
            
            // Automatycznie tworzymy rekordy frekwencji
            AttendanceManager.createAttendanceRecords(newTraining.Id);
            
            return newTraining;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating training: ' + e.getMessage());
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