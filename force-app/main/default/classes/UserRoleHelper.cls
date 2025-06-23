public class UserRoleHelper {
    
    @AuraEnabled(cacheable=true)
    public static String getCurrentUserRole() {
        Id currentUserId = UserInfo.getUserId();
        
        // Отладка - получаем все Permission Sets пользователя
        List<PermissionSetAssignment> allAssignments = [
            SELECT PermissionSet.Name, PermissionSet.Label 
            FROM PermissionSetAssignment 
            WHERE AssigneeId = :currentUserId
        ];
        
        System.debug('All Permission Sets for user: ' + allAssignments);
        
        List<PermissionSetAssignment> assignments = [
            SELECT PermissionSet.Name 
            FROM PermissionSetAssignment 
            WHERE AssigneeId = :currentUserId 
            AND (PermissionSet.Name IN ('Coach_Role', 'Player_Role') 
                 OR PermissionSet.Label IN ('Coach Role', 'Player Role'))
        ];
        
        System.debug('Matching Permission Sets: ' + assignments);
        
        for(PermissionSetAssignment assignment : assignments) {
            if(assignment.PermissionSet.Name == 'Coach_Role' || assignment.PermissionSet.Name.contains('Coach')) {
                return 'COACH';
            }
            if(assignment.PermissionSet.Name == 'Player_Role' || assignment.PermissionSet.Name.contains('Player')) {
                return 'PLAYER';
            }
        }
        
        if(UserInfo.getProfileId() == [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1].Id) {
            return 'ADMIN';
        }
        
        return 'NONE';
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean isCoach() {
        String role = getCurrentUserRole();
        return role == 'COACH' || role == 'ADMIN';
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean isPlayer() {
        return getCurrentUserRole() == 'PLAYER';
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean isAdmin() {
        return getCurrentUserRole() == 'ADMIN';
    }
    
    @AuraEnabled(cacheable=true)
    public static List<SportTeam__c> getAccessibleTeams() {
        String role = getCurrentUserRole();
        Id currentUserId = UserInfo.getUserId();
        
        if(role == 'ADMIN') {
            return [SELECT Id, Name, Sport__c, Category__c FROM SportTeam__c WHERE Active__c = true];
        }
        
        if(role == 'COACH') {
            Set<Id> teamIds = new Set<Id>();
            
            for(SportTeam__c team : [SELECT Id FROM SportTeam__c WHERE Team_Coach__c = :currentUserId AND Active__c = true]) {
                teamIds.add(team.Id);
            }
            
            for(SportTraining__c training : [SELECT Team__c FROM SportTraining__c WHERE Coach__c = :currentUserId]) {
                if(training.Team__c != null) {
                    teamIds.add(training.Team__c);
                }
            }
            
            if(teamIds.isEmpty()) {
                return new List<SportTeam__c>();
            }
            
            return [
                SELECT Id, Name, Sport__c, Category__c 
                FROM SportTeam__c 
                WHERE Id IN :teamIds AND Active__c = true
            ];
        }
        
        if(role == 'PLAYER') {
            Set<Id> teamIds = new Set<Id>();
            String currentUserName = UserInfo.getName();
            
            for(SportPlayer__c player : [SELECT Team__c FROM SportPlayer__c WHERE Name = :currentUserName]) {
                if(player.Team__c != null) {
                    teamIds.add(player.Team__c);
                }
            }
            
            if(teamIds.isEmpty()) {
                return new List<SportTeam__c>();
            }
            
            return [
                SELECT Id, Name, Sport__c, Category__c 
                FROM SportTeam__c 
                WHERE Id IN :teamIds AND Active__c = true
            ];
        }
        
        return new List<SportTeam__c>();
    }
    
    @AuraEnabled(cacheable=true)
    public static List<SportPlayer__c> getMyPlayerRecord() {
        return [
            SELECT Id, Name, Team__c, Jersey_Number__c, Position__c
            FROM SportPlayer__c 
            WHERE Name = :UserInfo.getName()
            LIMIT 1
        ];
    }
    
    // Метод для отладки - можно вызвать из Developer Console
    public static void debugUserPermissions() {
        Id currentUserId = UserInfo.getUserId();
        System.debug('Current User ID: ' + currentUserId);
        System.debug('Current User Name: ' + UserInfo.getName());
        
        List<PermissionSetAssignment> allAssignments = [
            SELECT PermissionSet.Name, PermissionSet.Label 
            FROM PermissionSetAssignment 
            WHERE AssigneeId = :currentUserId
        ];
        
        System.debug('All Permission Set Assignments:');
        for(PermissionSetAssignment psa : allAssignments) {
            System.debug('- Name: ' + psa.PermissionSet.Name + ', Label: ' + psa.PermissionSet.Label);
        }
        
        System.debug('Current Role: ' + getCurrentUserRole());
    }
}