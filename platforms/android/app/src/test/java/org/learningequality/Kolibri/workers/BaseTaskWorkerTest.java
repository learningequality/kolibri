package org.learningequality.Kolibri.workers;

import static org.junit.Assert.assertEquals;

import androidx.work.Data;
import org.junit.Test;

/**
 * Tests for BaseTaskWorker's progress deduplication logic.
 *
 * <p>The hashCode-based dedup can cause collisions where two different Data objects with the same
 * hashCode are incorrectly treated as duplicates. Using equals() fixes this.
 */
public class BaseTaskWorkerTest {

  /**
   * Verifies that two Data objects that are logically equal (same key/value pairs) report equals()
   * == true. This is the baseline case where dedup should suppress the update.
   */
  @Test
  public void data_equals_returnsTrueForIdenticalData() {
    Data data1 =
        new Data.Builder()
            .putString("id", "abc")
            .putString("notificationTitle", "Downloading")
            .putString("notificationText", "50%")
            .putInt("progress", 50)
            .putInt("totalProgress", 100)
            .build();

    Data data2 =
        new Data.Builder()
            .putString("id", "abc")
            .putString("notificationTitle", "Downloading")
            .putString("notificationText", "50%")
            .putInt("progress", 50)
            .putInt("totalProgress", 100)
            .build();

    assertEquals("Identical Data objects should be equal", data1, data2);
  }

  /**
   * Verifies that two Data objects with different values are not equal, even if they might produce
   * the same hashCode. This test documents the risk: hashCode collisions cause false dedup.
   *
   * <p>Note: We can't easily construct Data objects with guaranteed hashCode collisions in a unit
   * test, but we CAN verify that equals() correctly distinguishes objects with different content.
   */
  @Test
  public void data_equals_returnsFalseForDifferentData() {
    Data data1 =
        new Data.Builder()
            .putString("id", "abc")
            .putString("notificationTitle", "Downloading")
            .putInt("progress", 50)
            .putInt("totalProgress", 100)
            .build();

    Data data2 =
        new Data.Builder()
            .putString("id", "abc")
            .putString("notificationTitle", "Downloading")
            .putInt("progress", 51)
            .putInt("totalProgress", 100)
            .build();

    // equals() correctly distinguishes these; hashCode() might not
    assertEquals(false, data1.equals(data2));
  }
}
