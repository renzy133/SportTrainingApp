import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
import getUpcomingTrainings from '@salesforce/apex/TrainingController.getUpcomingTrainings';
import getTrainingAttendance from '@salesforce/apex/AttendanceManager.getTrainingAttendance';
import updateBulkAttendance from '@salesforce/apex/AttendanceManager.updateBulkAttendance';
import getActiveTeams from '@salesforce/apex/TeamController.getActiveTeams';
import ID_FIELD from '@salesforce/schema/SportAttendance__c.Id';
import STATUS_FIELD from '@salesforce/schema/SportAttendance__c.Status__c';
import NOTES_FIELD from '@salesforce/schema/SportAttendance__c.Notes__c';

export default class AttendanceManagement extends LightningElement {
    @track selectedTeamId = '';
    @track selectedTrainingId = '';
    @track trainings = [];
    @track attendanceRecords = [];
    @track draftValues = [];
    @track unsavedChanges = false;

    teamOptions = [];
    trainingOptions = [];
    wiredAttendanceResult;

    statusOptions = [
        { label: 'Obecny', value: 'Obecny' },
        { label: 'Nieobecny', value: 'Nieobecny' },
        { label: 'Usprawiedliwiony', value: 'Usprawiedliwiony' }
    ];

    columns = [
        { 
            label: 'Nr', 
            fieldName: 'JerseyNumber', 
            type: 'number',
            initialWidth: 60
        },
        { label: 'Zawodnik', fieldName: 'PlayerName', type: 'text' },
        { 
            label: 'Status', 
            fieldName: 'Status__c', 
            type: 'picklistColumn',
            typeAttributes: {
                placeholder: 'Wybierz status',
                options: { fieldName: 'statusOptions' },
                value: { fieldName: 'Status__c' },
                context: { fieldName: 'Id' }
            },
            editable: true
        },
        { label: 'Notatki', fieldName: 'Notes__c', type: 'text', editable: true },
        {
            type: 'action',
            typeAttributes: { rowActions: this.getRowActions }
        }
    ];

    getRowActions(row, doneCallback) {
        const actions = [];
        if (row.Status__c !== 'Obecny') {
            actions.push({ label: 'Oznacz jako obecny', name: 'mark_present' });
        }
        if (row.Status__c !== 'Nieobecny') {
            actions.push({ label: 'Oznacz jako nieobecny', name: 'mark_absent' });
        }
        if (row.Status__c !== 'Usprawiedliwiony') {
            actions.push({ label: 'Usprawiedliw', name: 'mark_excused' });
        }
        doneCallback(actions);
    }

    @wire(getActiveTeams)
    wiredTeams(result) {
        if (result.data) {
            this.teamOptions = result.data.map(team => ({
                label: team.Name,
                value: team.Id
            }));
            
            if (this.teamOptions.length > 0 && !this.selectedTeamId) {
                this.selectedTeamId = this.teamOptions[0].value;
            }
        }
    }

    @wire(getUpcomingTrainings, { teamId: '$selectedTeamId' })
    wiredTrainings(result) {
        this.wiredTrainingsResult = result;
        if (result.data) {
            this.trainings = result.data;
            this.trainingOptions = result.data.map(training => {
                // Formatowanie czasu
                let timeStr = '';
                if (training.Start_Time__c) {
                    const totalMilliseconds = training.Start_Time__c;
                    const totalSeconds = Math.floor(totalMilliseconds / 1000);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
                
                return {
                    label: `${training.Name} - ${training.Training_Date__c} ${timeStr}`,
                    value: training.Id
                };
            });
            
            if (this.trainingOptions.length > 0 && !this.selectedTrainingId) {
                this.selectedTrainingId = this.trainingOptions[0].value;
            }
        }
    }

    @wire(getTrainingAttendance, { trainingId: '$selectedTrainingId' })
    wiredAttendance(result) {
        this.wiredAttendanceResult = result;
        if (result.data && this.selectedTrainingId) {
            this.attendanceRecords = result.data.map(record => ({
                ...record,
                PlayerName: record.Player__r ? record.Player__r.Name : '',
                JerseyNumber: record.Player__r ? record.Player__r.Jersey_Number__c : null,
                statusOptions: this.statusOptions
            }));
            this.unsavedChanges = false;
        } else if (result.error) {
            this.showToast('Błąd', 'Nie udało się pobrać listy obecności', 'error');
        }
    }

    handleTeamChange(event) {
        if (this.unsavedChanges && !confirm('Masz niezapisane zmiany. Czy na pewno chcesz zmienić drużynę?')) {
            event.target.value = this.selectedTeamId;
            return;
        }
        
        this.selectedTeamId = event.detail.value;
        this.selectedTrainingId = '';
        this.attendanceRecords = [];
        this.draftValues = [];
        this.unsavedChanges = false;
    }

    handleTrainingChange(event) {
        if (this.unsavedChanges && !confirm('Masz niezapisane zmiany. Czy na pewno chcesz zmienić trening?')) {
            event.target.value = this.selectedTrainingId;
            return;
        }
        
        this.selectedTrainingId = event.detail.value;
        this.draftValues = [];
        this.unsavedChanges = false;
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        let newStatus = '';
        
        switch (actionName) {
            case 'mark_present':
                newStatus = 'Obecny';
                break;
            case 'mark_absent':
                newStatus = 'Nieobecny';
                break;
            case 'mark_excused':
                newStatus = 'Usprawiedliwiony';
                break;
            default:
                return;
        }
        
        this.quickUpdateStatus(row.Id, newStatus);
    }

    async quickUpdateStatus(recordId, newStatus) {
        try {
            const fields = {};
            fields[ID_FIELD.fieldApiName] = recordId;
            fields[STATUS_FIELD.fieldApiName] = newStatus;
            
            const recordInput = { fields };
            await updateRecord(recordInput);
            
            this.showToast('Sukces', 'Status został zaktualizowany', 'success');
            refreshApex(this.wiredAttendanceResult);
            
        } catch (error) {
            this.showToast('Błąd', 'Nie udało się zaktualizować statusu', 'error');
        }
    }

    handleCellChange(event) {
        this.unsavedChanges = true;
    }

    markAllPresent() {
        if (confirm('Czy na pewno chcesz oznaczyć wszystkich jako obecnych?')) {
            const updates = this.attendanceRecords.map(record => ({
                id: record.Id,
                status: 'Obecny',
                notes: record.Notes__c || ''
            }));
            
            this.bulkUpdate(updates);
        }
    }

    markAllAbsent() {
        if (confirm('Czy na pewno chcesz oznaczyć wszystkich jako nieobecnych?')) {
            const updates = this.attendanceRecords.map(record => ({
                id: record.Id,
                status: 'Nieobecny',
                notes: record.Notes__c || ''
            }));
            
            this.bulkUpdate(updates);
        }
    }

    async bulkUpdate(updates) {
        try {
            await updateBulkAttendance({ attendanceData: updates });
            this.showToast('Sukces', 'Lista obecności została zaktualizowana', 'success');
            this.draftValues = [];
            this.unsavedChanges = false;
            refreshApex(this.wiredAttendanceResult);
        } catch (error) {
            this.showToast('Błąd', 'Nie udało się zaktualizować listy obecności', 'error');
        }
    }

    async handleSave(event) {
        try {
            const draftValues = event.detail.draftValues;
            const recordInputs = draftValues.map(draft => {
                const fields = {};
                fields[ID_FIELD.fieldApiName] = draft.Id;
                if (draft.Status__c) fields[STATUS_FIELD.fieldApiName] = draft.Status__c;
                if (draft.Notes__c !== undefined) fields[NOTES_FIELD.fieldApiName] = draft.Notes__c;
                return { fields };
            });

            const promises = recordInputs.map(recordInput => updateRecord(recordInput));
            await Promise.all(promises);

            this.showToast('Sukces', 'Lista obecności została zaktualizowana', 'success');
            
            this.draftValues = [];
            this.unsavedChanges = false;
            
            refreshApex(this.wiredAttendanceResult);
            
        } catch (error) {
            this.showToast('Błąd', 'Nie udało się zaktualizować listy obecności', 'error');
        }
    }

    handleCancel() {
        this.draftValues = [];
        this.unsavedChanges = false;
    }

    get hasAttendanceData() {
        return this.attendanceRecords && this.attendanceRecords.length > 0;
    }

    get presentCount() {
        return this.attendanceRecords.filter(record => record.Status__c === 'Obecny').length;
    }

    get absentCount() {
        return this.attendanceRecords.filter(record => record.Status__c === 'Nieobecny').length;
    }

    get excusedCount() {
        return this.attendanceRecords.filter(record => record.Status__c === 'Usprawiedliwiony').length;
    }

    get attendancePercentage() {
        if (this.attendanceRecords.length === 0) return 0;
        return Math.round((this.presentCount / this.attendanceRecords.length) * 100);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({
            title,
            message,
            variant
        }));
    }
}