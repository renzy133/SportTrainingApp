public class UserRoleHelper {
    
    public enum UserRole { ADMIN, COACH, PLAYER, NONE }
    
    @AuraEnabled(cacheable=true)
    public static UserRole getCurrentUserRole() {
        Id currentUserId = UserInfo.getUserId();
        
        List<PermissionSetAssignment> assignments = [
            SELECT PermissionSet.Name 
            FROM PermissionSetAssignment 
            WHERE AssigneeId = :currentUserId 
            AND PermissionSet.Name IN ('Coach_Role', 'Player_Role')
        ];
        
        for(PermissionSetAssignment assignment : assignments) {
            if(assignment.PermissionSet.Name == 'Coach_Role') {
                return UserRole.COACH;
            }
            if(assignment.PermissionSet.Name == 'Player_Role') {
                return UserRole.PLAYER;
            }
        }
        
        if(UserInfo.getProfileId() == [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1].Id) {
            return UserRole.ADMIN;
        }
        
        return UserRole.NONE;
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean isCoach() {
        return getCurrentUserRole() == UserRole.COACH || getCurrentUserRole() == UserRole.ADMIN;
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean isPlayer() {
        return getCurrentUserRole() == UserRole.PLAYER;
    }
    
    @AuraEnabled(cacheable=true)
    public static Boolean isAdmin() {
        return getCurrentUserRole() == UserRole.ADMIN;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<SportTeam__c> getAccessibleTeams() {
        UserRole role = getCurrentUserRole();
        Id currentUserId = UserInfo.getUserId();
        
        if(role == UserRole.ADMIN) {
            return [SELECT Id, Name, Sport__c, Category__c FROM SportTeam__c WHERE Active__c = true];
        }
        
        if(role == UserRole.COACH) {
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
        
        if(role == UserRole.PLAYER) {
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
}