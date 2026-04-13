package handlers

import (
	"requirements-app/backend/internal/models"
)

func grantTrue(g map[string]bool, key string) bool {
	return g != nil && g[key]
}

// mergeUpdateRequirementRequestWithGrants подставляет из существующей записи поля, которые пользователю нельзя менять.
func mergeUpdateRequirementRequestWithGrants(item models.Requirement, req UpdateRequirementRequest, g map[string]bool) UpdateRequirementRequest {
	out := req
	if !grantTrue(g, "shortName") {
		out.ShortName = item.ShortName
	}
	if !grantTrue(g, "initiator") {
		out.Initiator = item.Initiator
	}
	if !grantTrue(g, "responsiblePerson") {
		out.ResponsiblePerson = item.ResponsiblePerson
	}
	if !grantTrue(g, "sectionName") {
		out.SectionName = item.SectionName
	}
	if !grantTrue(g, "proposalText") {
		out.ProposalText = item.ProposalText
	}
	if !grantTrue(g, "problemComment") {
		out.ProblemComment = item.ProblemComment
	}
	if !grantTrue(g, "discussionSummary") {
		out.DiscussionSummary = item.DiscussionSummary
	}
	if !grantTrue(g, "implementationQueue") {
		out.ImplementationQueue = item.ImplementationQueue
	}
	if !grantTrue(g, "noteText") {
		out.NoteText = item.NoteText
	}
	if !grantTrue(g, "contractGk") {
		out.ContractName = item.ContractName
		out.ContractTZFunctionID = cloneUintPtr(item.ContractTZFunctionID)
		out.TZPointText = item.TZPointText
		out.NmckPointText = item.NmckPointText
	}
	if !grantTrue(g, "statusText") {
		out.StatusText = item.StatusText
	}
	if !grantTrue(g, "systemType") {
		out.SystemType = item.SystemType
	}
	if !grantTrue(g, "completedAt") {
		out.CompletedAt = item.CompletedAt
	}
	if !grantTrue(g, "ditOutgoing") {
		out.DitOutgoingNumber = item.DitOutgoingNumber
		out.DitOutgoingDate = item.DitOutgoingDate
	}
	// Идентификатор задачи при частичных правах не меняем с клиента.
	tid := item.TaskIdentifier
	out.TaskIdentifier = &tid
	return out
}

func cloneUintPtr(p *uint) *uint {
	if p == nil {
		return nil
	}
	v := *p
	return &v
}

func isFullRequirementEditor(isSuper bool, accessLevel string) bool {
	if isSuper {
		return true
	}
	return accessLevel == "edit"
}
