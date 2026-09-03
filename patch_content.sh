#!/bin/bash
awk '
/\{activeTab === '"'"'batch'"'"' && \(/ {
    print "      {/* ========================================================================= */}"
    print "      {/* TAB: CARD TEMPLATES MANAGER */}"
    print "      {/* ========================================================================= */}"
    print "      {activeTab === '"'"'templates'"'"' && ("
    print "        <CardTemplatesManager"
    print "          templates={templates}"
    print "          categories={categories}"
    print "          onSaveTemplate={onSaveTemplate!}"
    print "          onDeleteTemplate={onDeleteTemplate!}"
    print "        />"
    print "      )}"
    print ""
}
{ print }
' src/components/UserManagerView.tsx > temp.tsx && mv temp.tsx src/components/UserManagerView.tsx
