// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KdsStationSelector } from "@/components/kitchen/KdsStationSelector";
import { ALL_KDS_STATION_OPTION } from "@/hooks/useKdsStationFilter";

describe("KdsStationSelector", () => {
  it("renders station options when stations exist", () => {
    const onChange = vi.fn();
    render(
      <KdsStationSelector
        availableStations={[
          ALL_KDS_STATION_OPTION,
          { id: "kitchen", code: "kitchen", label: "Kitchen" },
          { id: "bar", code: "bar", label: "Bar" },
        ]}
        station="all"
        onStationChange={onChange}
      />,
    );

    expect(screen.getByTestId("kds-station-selector")).toBeInTheDocument();
    expect(screen.getByTestId("kds-station-kitchen")).toHaveTextContent("Kitchen");
    expect(screen.getByTestId("kds-station-bar")).toHaveTextContent("Bar");

    fireEvent.click(screen.getByTestId("kds-station-bar"));
    expect(onChange).toHaveBeenCalledWith("bar");
  });
});
