# NEW POINTS RAISED AFTER APP TESTING:



Summary of points: Database and PDF need to have some logical value/message in case if user do not fill any question and in NULL situations because currently when user is skipping any question or sub-questions, it shows "not provided" and "no entries recorded" message on PDF against every unfilled question answer. Some database tables need new data mapping. Some important lists need to incorporate at earliest to populate for the users. Some questions need position corrections and some need improvements for better user experience. 

(A)	New Database mapping addition requirements

(B)	Functionality change or upgrade requirements in questions

(C)	Text/Labels based change requirements 

(D)	UI based changes requirements





Strategy to make changes: Section wise change implementation



Changelog.md file creation to track updates and changes:

Semantic Categories: Group changes under specific markdown subheadings so they are easy to scan:

•	Added - for new features.

•	Changed - for changes in existing functionality.

•	Deprecated - for soon-to-be-removed features.

•	Removed - for features removed in this version.

•	Fixed - for any bug fixes.

•	Security - in case of vulnerabilities.





## (A) DATABASE Mapping/work:



1. Section A question number (ix) (x) (xi), Zone type, ownership of establishment and legal structure of ownership need Database values correction (Table: lookup\_values).
2. Section A, question (xiv) Total Establishment Area need customized List of Area Units only.
3. Section A, need new questions related to biodata of interviewee.
4. Section A, question number (xv) need to be added in DB along with its Unit list.
5. Section A, question number (xiii) Establishments of the parent company need PSIC list.
6. Section B question number (iii), Daily operating hours / shift need Less than 8 Hours value option.
7. Section C, L2 list required for main and secondary products field with respect to industry type.
8. Section C, need new unit of measurement values in unit lists.
9. Section E, questions (vii) On-time delivery reliability and (viii) Product acceptance rate need new DB value of "Not Formally Tracked".
10. Section E, need new unit of measurement values in unit list.
11. Section G, question (i) need L2 lists for machines and its specs with respect to industry type.
12. Section G, question (viii) Machinery age profile need new answer type.
13. Section G, question (xi) Boilers ad pressure vessels need L5 list and question (xii) Weights and Measures equipment need L3 list. Have received from client need to Map into DB.
14. Section G, question (xv) Innovation and upgrading activities need new answer type and new database value of "No Plan".
15. Section H, question number (i) Monthly energy consumption by source.
16. Section H, question (ii) Power generation by source.



\## (B) App Functionality Issues:



1. Need to correct Section A questions because question of "Total Capital Investment" is not available in Section A which is last question of section A in real and can be assigned DB question number (xv). Table reference: "survey\_questions". It will have two fields. one is numeric/integer field to get entry and second for its unit of measurement. Unit list will be dropdown and customized containing only (Million PKR, Billion PKR, Million USD, Billion USD, Million Euro, Billion Euro) values. ##

2. Section A, need more new questions. currently total section A questions are 14 (excluding Total Capital Investment question). The question to add is related to get biodata of interviewee. interviewee name, designation, and contact number. It will be answer type repeating group to Add entries since interviewee can be multiple. Placement of these questions should be after question number (i) Name of Establishment. ##

3. Need to add customized Unit list containing only Area units for question (xiv) Total Establishment Area of Section A. ##

4. Section A, question number (vi) need data entry control and value validation check for Mobile number must be 11 digits and Email must be validated with format and syntax.
5. Section A, question number (xii) Parent company details need data entry control and value validation check for Phone and Cell number must be 11 digits and Email must be validated with format and syntax.

6. Section A, question number (ix) (x) (xi), Zone type, ownership of establishment and legal structure of ownership need Database values correction (i will do it my self). ##

7. Section A, question number (xii) Parent company (Yes/No) question need Heading and Sub-heading Label correction. \*\*

8. Section A, question number (xii) Parent Company (yes/no) and (xiii) Establishments of the parent company need new working strategy. When user selects "No" for question (xii) then it get message value "Not Applicable" on PDF instead of "not provided" and its related questions and question (xiii) will not appear in app and pdf both. But when user selects "Yes" for question (xii) then its further related questions and question (xiii) appears.

9. Section A, question number (xiii) Establishments of the parent company have "Major activity (PSIC class code or name)" field that need complete PSIC List attachment as dropdown containing only PSIC classes. ##
------------------------------------------------------------------------------------
10. Section B, questions need new working mechanism. Question number (ii) Current operation status needs to be asked at very start of Section B. when User selects "Permanently closed" then question number (ii) "Reason for closure"  appear for the user and rest questions dont appear in pdf  and DB gets null because it depends upon them. when user selects other options for Current operation status then question of "Months of Operation" and "Operational Hours" appear.

11. Section B, question number (i) Months of Operation need to have option of All so that all months can be selected automatically.
12. Section B question number (iii) need correction in its questions. first, the real survey form asks "Daily operating hours / shift" (present in app) then asks two related questions "Total working days per week" and "Total working months per year". Need to check Table "sec\_b\_operations" from DB.

13. Section B question number (iii) -> Total working days per week and Total working months per year both need values validation checks.
14. Section B question number (iii), Operational hours / shift have less values in dropdown options. need to add "Less than 8 Hours" option. ##
------------------------------------------------------------------------------------
15. Section C, question of Main and secondary products and production details need some improvements in list of unit of measurements for Daily output unit field, Annual production unit and Capacity unit of measurement. currently the unit list does not contain all unit types of measurement from all types of manufacturing industries. ##

16. Section C, question of Main and secondary products and production details have HS code (code or description) field. it need improvement in terms of List Completion of 9000 values and second when implemented, it have long descriptions that need to be adjusted for mobile screens size. (will do it later) ##

17. Section C, L2 list incorporation into Product name field with respect to industry type and along with ability to add Other (specify). ##
18. Section C, L2 list incorporation into Secondary Product name field with respect to industry type and along with ability to add Other (specify). Need to check question working mechanism for this. ##

19. Section C, in pdf for secondary products, fields of "Transformation stage on arrival", "Share in total revenue (%)" and "HS code (code or description)" are visible. disappear them. it is only related to main product kind.
------------------------------------------------------------------------------------
20. Section D, question number (i) and (ii) need improvement about if the user do not fill any value for in any field, it is zero by default and the pdf should show it.
21. Section D, in PDF not showing Employee subtotals for questions i and ii.
------------------------------------------------------------------------------------
22. Section E, question number (i) Sourcing type (% of inputs) need improvement about if the user do not put any value for in any field, the app stores 0 value automatically in the database since its integer field and PDF should also show it. Secondly, in case of Other Specify, need to add some spam text to help explain its purpose. PDF should also show Total percent out of 100.
23. Section E, question number (ii) Raw material sourcing (% by origin) need improvement about if the user do not put any value for in any field, the app stores 0 value automatically in the database since its integer field and PDF should show it. PDF should also show Total percent our of 100.
24. Section E, both questions of Supply disruption need Headings improvement. (will do it by self).\*\*
25. Section E, question of Major raw materials and inputs need improvement in list of units and HS code List Completion of 9000 values. (will do it later) ##
------------------------------------------------------------------------------------
26. Section F, question number (i) Types of buyers (% of sales) need improvement about if the user do not put any value for in any field, the app stores 0 value automatically in the database since its integer field and PDF should show it. Secondly, in case of Other Specify, need to add some spam text to help explain its purpose. PDF should also show Total percent out of 100.
27. Section F, question number (ii) Location of buyers (% of sales) need improvement about if the user do not put any value for in any field, the app stores 0 value automatically in the database since its integer field and PDF should show it. PDF should also show Total percent out of 100.
28. Section F, question (xi) Perception of strength \& weakness vs competitors if user do not select any option, then by default it become "Dont know / NA" for all of its answers in database and PDF should also show it. Also need to check the working of all the questions that are Matrix answer type based because it looks like they are not working correctly.
29. Section F, question (xii) Digital presence if user do not select any option then by default it become "NA" for the Database for all of its answers and PDF should show it.
------------------------------------------------------------------------------------
30. Section G, question (i) Critical machines, quantity and specification, L2 list need to incorporate for "Machine name" and "Specification" fields as dropdowns with respect to industry type and along with ability to add Other (specify). ##
31. Section G, question (i) Critical machines, quantity and specification, if its Null then PDF should show message "Not Applicable" instead of no entries recorded.
32. Section G, question number (ii) Plant processing capacity need improvement in terms of that we need to add spam describing to enter unit and period also. (will do it by self)\*\*

33. Section G, question (iii) Capacity utilization rate need improvement in functionality of when rate is below 75% then the reason question (iv) should appear otherwise not. PDF should also act in same way. Need to check working of these question.
34. Section G, question (v) Automation level (% of total machinery) need improvement about if the user do not fill any value for in any field, the app stores 0 value automatically in the database since its integer field and PDF should show it. PDF should also show Total out of 100.

35. Section G, question (viii) Machinery age profile have Number of machines field which is incorrect. Firstly, its working mechanism need to change by making it Answer type: Share Percent similar to Automation level (% of total machinery) question. Using Machinery age bracket values user will enter Share percent for each "percentage (%) of Total Machinery" out of 100. In case of Null, the app stores 0 automatically. Secondly. PDF will show each and total both. ##

36. Section G, question (xi) Boilers and pressure vessels, L5 list need to incorporate for Boiler / pressure vessel type field along with ability to add "Other (specify)". The received list have some new additional fields so need to map into DB. And also at first, Boilers vessels have its own fields and Pressure Vessels have its own. So user first will have to choose Vessel type then their respective fields will appear. (refer to L5-list.md). ##

37. Section G, question (xii) Weights and measures equipment, L3 list need to incorporate along with ability to add "Other (specify)". The received list have some new additional fields so need to map into DB. (refer to L3-list.md). ##

38. Section G, question (xi) and (xii), if all Null and get no entries then PDF should show message "Not Applicable".

39. Section G, question (xv) Innovation and upgrading activities need new working. For this question at start, the user should have an option of Yes or No against this question (xv). In case of "No" selected, all questions related to it will not appear in app and in PDF and database stores value: "No Plan" for every question automatically. In case of Yes selected, the all related questions will appear in app and in PDF. Hence, need to add one new option of dropdown "No plan" for each field. ##
------------------------------------------------------------------------------------
40. Section H, question number (i) Monthly energy consumption by source need new working mechanism. Firstly, currently it is repeating group answer type, Table: energy\_consumption but need to change it to percent share type. Secondly, this question have only three Fields: Fuel / energy source, Quantity per month, Energy Usage percentage. Moreover, need to add unit word 'kW' with heading label of Quantity per month. Moverover, After converting answer type, In case of Null, the app stores 0 automatically. PDF will show each and total both. ##

41. Section H, question (ii) Power generation by source need correction. First of all it only have three fields that are Power source, Capacity (kW) and Export (kW). Then after that for overall analysis, it asks about "Total Captive Capacity (kW)" and "Export Capacity (kW)" separately against this question (ii). Reference Tables: energy\_generation and sec\_h\_environment. The total is calculated automatically for Total Captive Capacity (kW). But Total Export Capacity (kW) is filled by user. ##

42. Section H, question number (vi) Water waste management need improvement. For better user experience, this question should have Yes and No at start. If user selects No, then its all related questions should not appear in app and PDF and database gets "No" value for all its questions automatically. In case user select Yes, then related questions appear in app and PDF.

43. Section H, question number (vii) Solid waste and by-products need new working mechanism. Table reference: solid\_waste\_streams and solid\_waste\_disposals. Currently for every field there is a question "is this waste generated?" But i want to shift this question out of it and make it starting question asked one time because If there is no solid waste and by-products generation, user selectes "NO". So in this scenario, no question will appear of "solid waste and by-product type" and "disposal method" in app and PDF. But if user choose "Yes" then questions appear in app and PDF. Moreover, disposal methods field have option of "Other (specify)" two times. It needs correct working that when user chooses option of Other disposal method then its text box should appear.

44. Section H, question number (viii) Green practice and circular economy need improvement. For better user experience, this question should have Yes and No at start. If user selects No, then its all related questions should not appear in app and PDF and database gets "No" value for all its questions automatically. In case user select Yes, then related questions appear in app and PDF.
------------------------------------------------------------------------------------
45. Section I, question number (i) Factory safety and environmental compliances need correction and improvement. Firstly, for better user experience, this question should have Yes and No at start. If user selects No, then its all related questions should not appear in app and PDF and database gets "N/A" value for all its questions automatically. In case user select Yes, then related questions appear in app and PDF. Secondly, Other (specify) option is not working properly and is not taking value by not showing text box. Need to check its functionality.
46. Section I, question number (ii) Quality, safety, export \& green certifications need correction and improvement. Firstly, for better user experience, this question should have Yes and No at start. If user selects No, then its all related questions should not appear in app and PDF and database gets "N/A" value for all its questions automatically. In case user select Yes, then related questions appear in app and PDF. Secondly, Other (specify) option is not working properly and is not taking value by not showing text box. Need to check its functionality.
------------------------------------------------------------------------------------
47. Section J should ask from user "Do you have Strategic Business Plan? (Yes/No)" so that questions of this section only appears if user chooses Yes otherwise not Just like Section K. PDF shows No and dont show its related question answers incase of No. ##
48. Section J, question number (i) Operational planning need improvement. Firstly, for better user experience, this question should have Yes and No at start. If user selects No, then its all related questions should not appear in app and PDF and database gets "No Plan" value for all its questions automatically. In case user select Yes, then related questions appear in app and PDF.
49. Section J, question number (iv) Primary area of reinvestment need correction. It is asking Other reinvestment area when user selects any option and then if user selects Other (specify) option, it asks for it again. Check this question functionality.
------------------------------------------------------------------------------------
50. Section K, if user selects answer No against its starting question Do they have a future plan? (Yes/No) then PDF should not show its related further questions because it shows answers of that as "Not provided".
51. Section K, question (ii) Future opportunities: collaborator and purpose need correction. if user selects dropdown option of "Not interested in any collaboration" from Potential collaborator than Purpose of collaboration will not appear otherwise it do.
52. Section K, question number (iv) Barriers \& bottlenecks need improvement. For better user experience, this question should have Yes and No at start. If user selects No, then its all related questions should not appear in app and PDF and database gets null rating value for all its questions automatically. In case user select Yes, then related questions appear in app and PDF. Secondly, i want to add definition of rating for the users. 1 represent Dont Happen, 2 represent rarely happen, 3 represent happens, 4 means more often happens, and 5 means frequently happens.
------------------------------------------------------------------------------------
53. Section L, GPS accuracy radius need to increase to 250m.



## (D) App UI/UX Issues: 



1. When user move to any section by clicking Next button or section buttons, page opens from bottom of the screen. It should not happen like this. When user move to any form section, it should start from Top. verify this UI functioning.

2. The buttons of the survey form section B-K is showing Done status by default. it should not show done until filled. however when a user is inside any section it shows current status, and section A shows pending until i fill required its fields and when i fill them it shows Done status. same goes to Section L. Verify the functioning of these survey form buttons to correct their status.

3. Removal of question-code from every questions. (will do it later)

























