public class TeamController {
    
    @AuraEnabled(cacheable=true)
    public static List<SportTeam__c> getActiveTeams() {
        return [
            SELECT Id, Name, Sport__c, Category__c, Active__c
            FROM SportTeam__c 
            WHERE Active__c = true
            ORDER BY Name
        ];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<SportPlayer__c> getTeamPlayers(Id teamId) {
        return [
            SELECT Id, Name, Jersey_Number__c, Position__c
            FROM SportPlayer__c 
            WHERE Team__c = :teamId
            ORDER BY Jersey_Number__c
        ];
    }
    
    @AuraEnabled
    public static SportTeam__c createTeam(String teamName, String sport, String category) {
        try {
            SportTeam__c newTeam = new SportTeam__c(
                Name = teamName,
                Sport__c = sport,
                Category__c = category,
                Active__c = true
            );
            insert newTeam;
            return newTeam;
        } catch (Exception e) {
            throw new AuraHandledException('Error creating team: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateTeam(Id teamId, String teamName, String sport, String category, Boolean active) {
        try {
            SportTeam__c team = [SELECT Id FROM SportTeam__c WHERE Id = :teamId];
            team.Name = teamName;
            team.Sport__c = sport;
            team.Category__c = category;
            team.Active__c = active;
            
            update team;
        } catch (Exception e) {
            throw new AuraHandledException('Error updating team: ' + e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void deleteTeam(Id teamId) {
        try {
            // Sprawdzamy czy drużyna nie ma przypisanych zawodników
            Integer playerCount = [SELECT COUNT() FROM SportPlayer__c WHERE Team__c = :teamId];
            if (playerCount > 0) {
                throw new AuraHandledException('Nie można usunąć drużyny z przypisanymi zawodnikami. Najpierw usuń lub przenieś zawodników.');
            }
            
            delete [SELECT Id FROM SportTeam__c WHERE Id = :teamId];
        } catch (Exception e) {
            throw new AuraHandledException('Error deleting team: ' + e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static Integer getTeamPlayerCount(Id teamId) {
        return [SELECT COUNT() FROM SportPlayer__c WHERE Team__c = :teamId];
    }
}