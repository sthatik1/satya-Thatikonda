import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

//creates table
const Record = ({
  record,
  editRecord,
  deleteRecord,
  toggleSelectRecord,
  selected,
}) => (
  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
    <td className="p-4 align-middle">
      <input
        type="checkbox"
        checked={selected}
        onChange={() => toggleSelectRecord(record._id)}
      />
    </td>
    <td className="p-4 align-middle">{record.name}</td>
    <td className="p-4 align-middle">{record.position}</td>
    <td className="p-4 align-middle">{record.level}</td>
    <td className="p-4 align-middle">
      <div className="flex gap-2">
        <button
          className="inline-flex items-center justify-center text-sm font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          onClick={() => editRecord(record._id)}
        >
          Edit
        </button>
        <button
          className="inline-flex items-center justify-center text-sm font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3"
          onClick={() => deleteRecord(record._id, record.isNew)}
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
);

export default function RecordList() {
  const [records, setRecords] = useState([]);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [hasUnsavedRecords, setHasUnsavedRecords] = useState(false);
  const [allRecords, setAllRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecords, setSelectedRecords] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  //dropdown
  const DropdownOptions = ["Intern", "Junior", "Senior"].map((item) => ({
    value: item,
    label: item,
  }));
  const [checkboxValue, setCheckboxValue] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // This method fetches the records from the database.
  useEffect(() => {
    fetch(`http://localhost:5050/record/`)
      .then((response) => response.json())
      .then((data) => {
        setAllRecords(data);
        setRecords(data);
      })
      .catch((error) => console.error("Error fetching records:", error));
  }, []);

  const handleUploadClick = () => fileInputRef.current.click();
  //handles excel file parsing assuming excel sheet has data in 3 columns
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.every((row) => row.length === 3)) {
          const formattedData = jsonData.map((row) => ({
            _id: uuidv4(),
            name: row[0],
            position: row[1],
            level: row[2],
            isNew: true,
          }));
          setRecords((prevRecords) => [...prevRecords, ...formattedData]);
          setShowSaveButton(true);
          setHasUnsavedRecords(true);
        } else {
          alert("Excel file should have 3 columns only.");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };
  // filtering for checkboxValue changes
  useEffect(() => {
    if (checkboxValue.length === 0) {
      setRecords(allRecords);
    } else {
      const updatedRecords = allRecords.filter((record) =>
        checkboxValue.some((checkbox) => record.level === checkbox.value)
      );
      setRecords(updatedRecords);
    }
  }, [checkboxValue, allRecords]);
  const handleCheckboxChange = (event) => {
    const { value, checked } = event.target;
    setCheckboxValue((prev) =>
      checked
        ? [...prev, { value }]
        : prev.filter((item) => item.value !== value)
    );
  };
  // updates checkbox value
  const handleCheckbox = () => {
    if (checkboxValue.length === 0) {
      setRecords(allRecords);
    } else {
      const updatedRecords = allRecords.filter((record) =>
        checkboxValue.some((checkbox) => record.level === checkbox.value)
      );
      setRecords(updatedRecords);
    }
  };
  //handles saving records with database
  const handleSave = async () => {
    const newRecords = records.filter((record) => record.isNew);
    try {
      await Promise.all(
        newRecords.map((record) =>
          fetch("http://localhost:5050/record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(record),
          })
        )
      );
      alert("Data has been saved");
      setShowSaveButton(false);
      setHasUnsavedRecords(false);
      const updatedRecords = await fetch(`http://localhost:5050/record/`).then(
        (res) => res.json()
      );
      setRecords(updatedRecords);
      setAllRecords(updatedRecords);
    } catch (error) {
      alert("Failed to save data.");
      console.error("Error saving records:", error);
    }
  };
  // This method will delete a record
  const deleteRecord = async (id, isNew) => {
    if (isNew) {
      setRecords(records.filter((record) => record._id !== id));
    } else {
      try {
        await fetch(`http://localhost:5050/record/${id}`, { method: "DELETE" });
        setRecords(records.filter((record) => record._id !== id));
      } catch (error) {
        console.error("Error deleting record:", error);
      }
    }
  };
  //handles the edit page and button
  const editRecord = (id) => {
    if (hasUnsavedRecords) {
      alert("Please click Save first before editing.");
    } else {
      navigate(`/edit/${id}`);
    }
  };
  // handles search
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    if (query === "") {
      setRecords(allRecords);
    } else {
      const filteredRecords = allRecords.filter(record =>
        record.name.toLowerCase().includes(query) ||
        record.position.toLowerCase().includes(query)
      );
      setRecords(filteredRecords);
    }
  };
  //lets you check records for delete multiple function OR you can check all records at once
  const toggleSelectRecord = (id) => {
    setSelectedRecords((prevSelectedRecords) =>
      prevSelectedRecords.includes(id)
        ? prevSelectedRecords.filter((recordId) => recordId !== id)
        : [...prevSelectedRecords, id]
    );
  };
  const toggleSelectAllRecords = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map((record) => record._id));
    }
  };

  //deleted the checked records
  const deleteSelectedRecords = async () => {
    try {
      await Promise.all(
        selectedRecords.map((id) =>
          fetch(`http://localhost:5050/record/${id}`, { method: "DELETE" })
        )
      );
      const updatedRecords = await fetch(`http://localhost:5050/record/`).then(
        (res) => res.json()
      );
      setRecords(updatedRecords);
      setAllRecords(updatedRecords);
      setSelectedRecords([]);
    } catch (error) {
      console.error("Error deleting selected records:", error);
    }
  };

  // This following section will display the table with the records of individuals.
  return (
    <div className="container mx-auto p-4">
      <h3 className="text-lg font-semibold mb-4">Employee Records</h3>
      <input
        type="text"
        placeholder="Search by first name"
        value={searchQuery}
        onChange={handleSearch}
        className="mb-4 p-2 border rounded-md w-full"
      />
      <div className="relative">
        <div className="border rounded-lg overflow-hidden">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="h-12 px-4 text-left font-medium">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAllRecords}
                      checked={selectedRecords.length === records.length}
                    />
                  </th>
                  <th className="h-12 px-4 text-left font-medium">Name</th>
                  <th className="h-12 px-4 text-left font-medium">Position</th>
                  <th className="h-12 px-4 text-left font-medium">
                    <div className="flex items-center relative">
                      Level
                      <FontAwesomeIcon
                        icon={faFilter}
                        className="ml-2 cursor-pointer"
                        onClick={() => setShowDropdown(!showDropdown)}
                      />
                      {showDropdown && (
                        <div className="absolute right-0 mt-2 bg-white border rounded-md shadow-lg z-10">
                          <div className="p-2 text-sm">
                            {DropdownOptions.map((option) => (
                              <div
                                key={option.value}
                                className="flex items-center"
                              >
                                <input
                                  type="checkbox"
                                  id={option.value}
                                  value={option.value}
                                  checked={checkboxValue.some(
                                    (item) => item.value === option.value
                                  )}
                                  onChange={(e) => {
                                    const { value, checked } = e.target;
                                    if (checked) {
                                      setCheckboxValue([
                                        ...checkboxValue,
                                        { value },
                                      ]);
                                    } else {
                                      setCheckboxValue(
                                        checkboxValue.filter(
                                          (item) => item.value !== value
                                        )
                                      );
                                    }
                                    handleCheckbox();
                                  }}
                                />
                                <label htmlFor={option.value} className="ml-2">
                                  {option.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="h-12 px-4 text-left font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <Record
                    key={record._id}
                    record={record}
                    deleteRecord={deleteRecord}
                    editRecord={editRecord}
                    toggleSelectRecord={toggleSelectRecord}
                    selected={selectedRecords.includes(record._id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showSaveButton && (
        <button
          className="inline-flex items-center justify-center text-md font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3 mt-4"
          onClick={handleSave}
        >
          Save Records
        </button>
      )}
      <button
        className="inline-flex items-center justify-center text-md font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3 mt-4"
        onClick={handleUploadClick}
      >
        Upload Records
      </button>
      <button
        className="inline-flex items-center justify-center text-md font-medium border bg-background hover:bg-slate-100 h-9 rounded-md px-3 mt-4"
        onClick={deleteSelectedRecords}
        disabled={selectedRecords.length === 0}
      >
        Delete Selected
      </button>
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
